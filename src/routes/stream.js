import 'dotenv/config';
import { streamText } from 'ai';
import { checkLimit, addUsage } from "../limits.js";
import { verifyApiKey } from "../users.js";

const model = process.env.MODEL;

export default async function registerStreamRoute(fastify) {
    fastify.post("/stream", {
        schema: {
            tags: ["stream"],
            summary: "Stream text",
            headers: {
                type: "object",
                properties: {
                    "x-api-key": { type: "string" },
                    "accept": {
                        type: "string",
                        const: "application/x-ndjson",
                        description: "Must be application/x-ndjson"
                    }
                },
                required: ["x-api-key", "accept"]
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
                    content: {
                        "application/x-ndjson": {
                            schema: {
                                type: "string",
                                description: "NDJSON stream. Each line is a JSON event object."
                            }
                        }
                    }
                },
                401: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
                403: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
                406: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                        message: { type: "string" },
                        accept: { type: "string" }
                    },
                    required: ["error"]
                },
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

        const { prompt } = req.body ?? {};

        const result = await streamText({ model, prompt });

        await addUsage(apiKey, 1);

        const accept = String(req.headers["accept"] || "");
        if (!accept.includes("application/x-ndjson")) {
            return reply.status(406).send({
                error: "Not Acceptable",
                message: "This endpoint only supports application/x-ndjson",
                accept: "application/x-ndjson"
            });
        }
        reply.raw.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
        reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
        reply.raw.setHeader("Connection", "keep-alive");
        reply.raw.setHeader("X-Accel-Buffering", "no");
        if (typeof reply.raw.flushHeaders === "function") {
            reply.raw.flushHeaders();
        }

        const send = (event) => {
            reply.raw.write(`${JSON.stringify(event)}\n`);
        };

        for await (const part of result.fullStream) {

            switch (part.type) {
                case 'start': {
                    send({ type: "start" });
                    break;
                }
                case 'text-start': {
                    send({ type: "text-start" });
                    break;
                }
                case 'text-delta': {
                    if (typeof part.text === "string" && part.text.length > 0) {
                        send({ type: "text-delta", delta: part.text });
                    }
                    break;
                }
                case 'text-end': {
                    send({ type: "text-end" });
                    break;
                }
                case 'reasoning-start': {
                    send({ type: "reasoning-start" });
                    break;
                }
                case 'reasoning-delta': {
                    if (typeof part.text === "string" && part.text.length > 0) {
                        send({ type: "reasoning-delta", delta: part.text });
                    }
                    break;
                }
                case 'reasoning-end': {
                    send({ type: "reasoning-end" });
                    break;
                }
                case 'finish': {
                    send({ type: "finish" });
                    break;
                }
                case 'error': {
                    send({ type: "error", message: part.error?.message ?? "Unknown error" });
                    break;
                }
            }
        }
        if (!reply.raw.writableEnded) {
            reply.raw.end();
        }
        return;
    });
}