import 'dotenv/config';
import { generateText } from 'ai';
import { checkLimit, addUsage } from "../limits.js";
import { verifyApiKey } from "../users.js";

const model = process.env.MODEL;

export default async function registerGenerateRoute(fastify) {
    fastify.post("/generate", {
        schema: {
            tags: ["text"],
            summary: "Generate text",
            headers: {
                type: "object",
                properties: {
                    "x-api-key": { type: "string" }
                },
                required: ["x-api-key"]
            },
            body: {
                type: "object",
                properties: {
                    prompt: { type: "string" }
                },
                required: ["prompt"],
                additionalProperties: false
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        text: { type: "string" }
                    },
                    required: ["text"]
                },
                401: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
                403: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
                429: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                        used: { type: "number" },
                        limit: { type: "number" }
                    },
                    required: ["error"]
                }
            }
        }
    }, async (req, reply) => {
        const apiKey = req.headers["x-api-key"];
        if (!apiKey) return reply.status(401).send({ error: "API key required" });

        const user = await verifyApiKey(apiKey);
        if (!user) return reply.status(403).send({ error: "Invalid API key" });

        const { allowed, used, limit } = await checkLimit(apiKey);
        if (!allowed) {
            return reply.status(429).send({
                error: "limit exceeded",
                used,
                limit
            });
        }

        const { prompt } = req.body;

        const result = await generateText({ model, prompt });

        await addUsage(apiKey, 1);

        return reply.send({
            text: result.text,
        });
    });
}