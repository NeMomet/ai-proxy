import Fastify from "fastify";
import registerGenerateRoute from "./routes/generate.js";
import registerStreamRoute from "./routes/stream.js";
import registerAdminRoutes from "./routes/admin.js";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

const app = Fastify({ logger: true });

await app.register(swagger, {
    openapi: {
        info: {
            title: "AI Proxy API",
            description: "API documentation for text generation and streaming endpoints",
            version: "1.0.0"
        },
        servers: [
            { url: process.env.BASE_URL ?? "http://localhost:3000" }
        ],
        tags: [
            { name: "root", description: "Root and health endpoints" },
            { name: "text", description: "Text generation endpoints" },
            { name: "stream", description: "Streaming endpoints" }
        ]
    }
});

await app.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
        docExpansion: "list",
        deepLinking: false
    }
});

app.register(registerGenerateRoute);
app.register(registerStreamRoute);
app.register(registerAdminRoutes);


app.get("/", {
    schema: { hide: true }
}, (req, reply) => {
    return reply.send("Hello World");
});

app.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log("Server running at", address);
});