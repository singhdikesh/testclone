import express from "express";
import user from "./routes/userRoutes.ts";
import auth from "./routes/authRoutes.ts";
import post from "./routes/postRoutes.ts";
import search from "./routes/searchRoutes.ts"
import { likePost } from "./controller/likeController.ts";
import { repost } from "./controller/repostController.ts";
import { createBookmark, getBookmark } from "./controller/bookmarkController.ts";
import { getFollowingStatus, toggleFollow } from "./controller/followController.ts";
import { createNotification, getNotification, markNotificationAsRead } from "./controller/notificationController.ts";
import { asyncHandler } from "./utils/asyncHandler.ts";
import { errorMiddleware } from "./middleware/error.ts";
import path from "node:path";


const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());


app.use("/users", user);
app.use("/auth", auth);
app.use("/posts", post);
app.use("/search", search);
app.post("/likes", asyncHandler(likePost));
app.post("/reposts", asyncHandler(repost));
app.post("/bookmarks", asyncHandler(createBookmark));
app.post("/bookmarks/list", asyncHandler(getBookmark));
app.post("/follows", asyncHandler(toggleFollow));
app.post("/follows/status", asyncHandler(getFollowingStatus));
app.post("/notifications", asyncHandler(createNotification));
app.get("/notifications", asyncHandler(getNotification));
app.patch("/notifications/:id/read", asyncHandler(markNotificationAsRead));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


































// old setup................

// import { createServer } from "node:http";

// import { listUsers } from "./prisma/users";


// const port = Number(process.env.PORT ?? 3000);




// createServer(async (_request, response) => {
//   try {
//     const users = await listUsers();
//     response.writeHead(200, { "content-type": "application/json" });
//     response.end(JSON.stringify({ users }));
//   } catch (error) {
//     console.error("Failed to query users:", error);
//     response.writeHead(500, { "content-type": "application/json" });
//     response.end(JSON.stringify({ error: "Could not query users yet." }));
//   }
// }).listen(port, "0.0.0.0", () => {
//   console.log(`Server running at http://localhost:${port}`);
// });
