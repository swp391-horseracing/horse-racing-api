interface PaginationQuery {
    page?: string;
    limit?: string;
}

export function getPagination(query: PaginationQuery) {
    const page = Math.max(1, parseInt(query.page ?? "1"));
    const limit = Math.min(100, parseInt(query.limit ?? "5")); // cap at 100
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

export function paginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
) {
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
