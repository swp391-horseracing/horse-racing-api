interface PaginationQuery {
    page?: number;
    limit?: number;
}

export function getPagination(query: PaginationQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, query.limit ?? 10); // cap at 100
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
