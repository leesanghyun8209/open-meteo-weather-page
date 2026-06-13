export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = "APP_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error(error);

  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      },
    },
    { status: 500 },
  );
}
