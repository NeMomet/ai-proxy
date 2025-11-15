import { createUser } from "../users.js";

export default async function registerAdminRoutes(fastify) {
    fastify.post("/admin/create-user", {
        schema: { hide: true }
    }, async (req, reply) => {
        const adminToken = req.headers["admin-token"];

        if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
            return reply.status(401).send({ error: "Unauthorized" });
        }

        const { userId, dailyLimit } = req.body;

        if (!userId) {
            return reply.status(400).send({ error: "userId is required" });
        }

        const apiKey = await createUser(userId, dailyLimit ?? 100);

        return reply.send({
            success: true,
            userId,
            apiKey,
            dailyLimit: dailyLimit ?? 100
        });
    });
}