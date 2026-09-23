import { WebSocketServer, WebSocket } from "ws";
import http from "node:http";
import { URL } from "node:url";
import { db } from "../prisma/db.ts";
import { verifyAcessToken } from "../utils/jwt.ts";

const connectedUsers = new Map<string, Set<WebSocket>>();
const aliveSockets = new WeakMap<WebSocket, boolean>();

type ClientMessage = {
    type: "send_message" | "mark_read" | "typing" | "reaction";
    conversationId: string;
    messageId?: string;
    content?: string;
    isTyping?: boolean;
    emoji?: string;
};

const send = (socket: WebSocket, payload: unknown) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
};

const broadcastToConversation = async (conversationId: string, payload: unknown) => {
    const members = await db.orm.public.ConversationMember.where({ conversationId }).all();
    for (const member of members) {
        for (const socket of connectedUsers.get(member.userId) ?? []) send(socket, payload);
    }
};

const broadcastPresence = (userId: string, online: boolean) => {
    for (const sockets of connectedUsers.values()) {
        for (const socket of sockets) send(socket, { type: "presence", userId, online });
    }
};

export const setupChatWebSocket = (server: http.Server) => {
    const wss = new WebSocketServer({
        server,
        path: "/ws"
    });

    const heartbeat = setInterval(() => {
        for (const sockets of connectedUsers.values()) {
            for (const socket of sockets) {
                if (aliveSockets.get(socket) === false) {
                    socket.terminate();
                    continue;
                }
                aliveSockets.set(socket, false);
                socket.ping();
            }
        }
    }, 30000);
    wss.on("close", () => clearInterval(heartbeat));

    wss.on("connection", async (socket, request) => {
        const token = new URL(request.url ?? "/", "http://localhost").searchParams.get("token");
        let userId = "";
        try {
            userId = token ? verifyAcessToken(token).userId : "";
            if (!userId || !await db.orm.public.User.where({ id: userId }).first()) throw new Error("Invalid user");
        } catch {
            socket.close(1008, "Authentication required");
            return;
        }

        const sockets = connectedUsers.get(userId) ?? new Set<WebSocket>();
        sockets.add(socket);
        aliveSockets.set(socket, true);
        connectedUsers.set(userId, sockets);
        broadcastPresence(userId, true);
        for (const [onlineUserId] of connectedUsers) send(socket, { type: "presence", userId: onlineUserId, online: true });
        console.log("WebSocket client connected");
        send(socket, { type: "ready", userId });
        socket.on("pong", () => aliveSockets.set(socket, true));

        socket.on("message", async (data) => {
            try {
                const message = JSON.parse(data.toString()) as ClientMessage;
                if (!message.conversationId || !["send_message", "mark_read", "typing", "reaction"].includes(message.type)) return;
                const membership = await db.orm.public.ConversationMember.where({ conversationId: message.conversationId, userId }).first();
                if (!membership) return send(socket, { type: "error", error: "You are not a member of this conversation." });

                if (message.type === "typing") {
                    await broadcastToConversation(message.conversationId, {
                        type: "typing",
                        conversationId: message.conversationId,
                        userId,
                        isTyping: message.isTyping === true,
                    });
                    return;
                }

                if (message.type === "reaction") {
                    const emoji = message.emoji?.trim();
                    if (!emoji || emoji.length > 8) return send(socket, { type: "error", error: "Choose a valid reaction." });
                    if (!message.messageId) return send(socket, { type: "error", error: "Message id is required." });
                    const targetMessage = await db.orm.public.Message.where({ id: message.messageId, conversationId: message.conversationId }).first();
                    if (!targetMessage) return send(socket, { type: "error", error: "Message not found in this conversation." });
                    const existing = await db.orm.public.MessageReaction.where({ messageId: message.messageId, userId, emoji }).first();
                    if (existing) {
                        await db.orm.public.MessageReaction.where({ id: existing.id }).delete();
                    } else {
                        await db.orm.public.MessageReaction.create({ messageId: message.messageId, userId, emoji });
                    }
                    const reactions = await db.orm.public.MessageReaction.where({ messageId: message.messageId }).all();
                    await broadcastToConversation(message.conversationId, {
                        type: "reaction",
                        messageId: message.messageId,
                        reactions,
                    });
                    return;
                }

                if (message.type === "mark_read") {
                    const messages = await db.orm.public.Message.where({ conversationId: message.conversationId }).all();
                    for (const item of messages) {
                        if (item.senderId === userId) continue;
                        const read = await db.orm.public.MessageRead.where({ messageId: item.id, userId }).first();
                        if (!read) await db.orm.public.MessageRead.create({ messageId: item.id, userId });
                    }
                    return;
                }

                const content = message.content?.trim();
                if (!content || content.length > 2000) return send(socket, { type: "error", error: "Messages must contain 1 to 2000 characters." });
                const created = await db.orm.public.Message.create({
                    conversationId: message.conversationId,
                    senderId: userId,
                    content,
                    type: "TEXT",
                });
                const sender = await db.orm.public.User.where({ id: userId }).first();
                await broadcastToConversation(message.conversationId, {
                    type: "message",
                    message: {
                        ...created,
                        createdAt: String(created.createdAt),
                        reactions: [],
                        sender: sender ? { id: sender.id, name: sender.name, username: sender.username, avatar: sender.avatar } : null,
                    },
                });
            } catch (error) {
                console.log("Invalid WebSocket message");
                send(socket, { type: "error", error: "Could not process that message." });
            }
        });

        socket.on("close", () => {
            sockets.delete(socket);
            if (sockets.size === 0) {
                connectedUsers.delete(userId);
                broadcastPresence(userId, false);
            }
            console.log("WebSocket client disconnected");
        });

        socket.on("error", (error) => {
            console.error("WebSocket error:", error);
        });
    });

    return wss;
}