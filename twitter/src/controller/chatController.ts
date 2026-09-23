import type { Request, Response, NextFunction } from "express";
import { db } from "../prisma/db.ts";
import { BadRequestException } from "../exception/badRequest.ts";
import { ErrorCodes } from "../exception/HttpException.ts";

const getMembership = async (conversationId: string, userId: string) =>
    db.orm.public.ConversationMember.where({ conversationId, userId }).first();

const timestamp = (value: unknown) => {
    const parsed = Date.parse(typeof value === "string" ? value : String(value));
    return Number.isNaN(parsed) ? 0 : parsed;
};

const userSummary = (user: { id: string; name: string; username: string; avatar?: string | null }) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
});

const conversationSummary = async (conversationId: string, currentUserId: string) => {
    const conversation = await db.orm.public.Conversation.where({ id: conversationId }).first();
    if (!conversation) return null;

    const memberships = await db.orm.public.ConversationMember.where({ conversationId }).all();
    const members = (await Promise.all(memberships.map(async (membership) => {
        const user = await db.orm.public.User.where({ id: membership.userId }).first();
        return user ? userSummary(user) : null;
    }))).filter((user): user is NonNullable<typeof user> => user !== null);
    const messages = await db.orm.public.Message.where({ conversationId }).all();
    const lastMessage = [...messages].sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt))[0];
    const unreadCount = await Promise.all(messages.filter((message) => message.senderId !== currentUserId).map(async (message) => {
        const read = await db.orm.public.MessageRead.where({ messageId: message.id, userId: currentUserId }).first();
        return read ? 0 : 1;
    }));

    return {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        members,
        lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            type: lastMessage.type,
            createdAt: String(lastMessage.createdAt),
            reactions: [],
        } : null,
        unreadCount: unreadCount.reduce((total, count) => total + count, 0),
    };
};

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
    const userId = typeof req.query.userId === "string" ? req.query.userId : "";
    if (!userId) return next(new BadRequestException("User id is required", ErrorCodes.MISSING_REQUIRED_FIELDS));

    const memberships = await db.orm.public.ConversationMember.where({ userId }).all();
    const conversations = (await Promise.all(memberships.map((membership) => conversationSummary(membership.conversationId, userId))))
        .filter((conversation): conversation is NonNullable<typeof conversation> => conversation !== null)
        .sort((a, b) => timestamp(b.lastMessage?.createdAt) - timestamp(a.lastMessage?.createdAt));

    return res.json({ success: true, data: conversations });
};

export const createDirectConversation = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, otherUserId } = req.body as { userId?: string; otherUserId?: string };
    if (!userId || !otherUserId || userId === otherUserId) {
        return next(new BadRequestException("Two different users are required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    const otherUser = await db.orm.public.User.where({ id: otherUserId }).first();
    if (!otherUser) return next(new BadRequestException("User not found", ErrorCodes.USER_NOT_FOUND));

    const ownMemberships = await db.orm.public.ConversationMember.where({ userId }).all();
    for (const membership of ownMemberships) {
        const members = await db.orm.public.ConversationMember.where({ conversationId: membership.conversationId }).all();
        if (members.length === 2 && members.some((member) => member.userId === otherUserId)) {
            const existing = await conversationSummary(membership.conversationId, userId);
            return res.json({ success: true, data: existing });
        }
    }

    const conversation = await db.orm.public.Conversation.create({ type: "DIRECT" });
    await db.orm.public.ConversationMember.create({ conversationId: conversation.id, userId, role: "MEMBER" });
    await db.orm.public.ConversationMember.create({ conversationId: conversation.id, userId: otherUserId, role: "MEMBER" });

    return res.status(201).json({ success: true, data: await conversationSummary(conversation.id, userId) });
};

export const getConversationMessages = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    const userId = typeof req.query.userId === "string" ? req.query.userId : "";
    const { id: conversationId } = req.params;
    if (!userId) return next(new BadRequestException("User id is required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    if (!await getMembership(conversationId, userId)) return next(new BadRequestException("Conversation not found", ErrorCodes.POST_NOT_FOUND));

    const messages = await db.orm.public.Message.where({ conversationId }).all();
    const data = await Promise.all([...messages]
        .sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt))
        .map(async (message) => {
            const [sender, reactions] = await Promise.all([
                db.orm.public.User.where({ id: message.senderId }).first(),
                db.orm.public.MessageReaction.where({ messageId: message.id }).all(),
            ]);
            return {
                ...message,
                createdAt: String(message.createdAt),
                reactions,
                sender: sender ? userSummary(sender) : null,
            };
        }));

    return res.json({ success: true, data });
};

export const markConversationRead = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    const userId = typeof req.body.userId === "string" ? req.body.userId : "";
    const { id: conversationId } = req.params;
    if (!userId || !await getMembership(conversationId, userId)) {
        return next(new BadRequestException("Conversation access denied", ErrorCodes.UNAUTHORIZED));
    }

    const messages = await db.orm.public.Message.where({ conversationId }).all();
    for (const message of messages) {
        if (message.senderId === userId) continue;
        const existing = await db.orm.public.MessageRead.where({ messageId: message.id, userId }).first();
        if (!existing) await db.orm.public.MessageRead.create({ messageId: message.id, userId });
    }

    return res.json({ success: true, data: null });
};
