import {
    OpenAPIRegistry,
    OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";

export const registry = new OpenAPIRegistry();

export function generateOpenApiDoc() {
    const generator = new OpenApiGeneratorV3(registry.definitions);
    return generator.generateDocument({
        openapi: "3.0.0",
        info: {
            title: "Horse Racing API",
            version: "1.0.0",
        },
        servers: [{ url: "/api" }],
    });
}
