export interface HealthCheckResponse {
  ok: true;
  data: {
    status: 'ok';
    timestamp: string;
  };
}

export async function healthCheckMain(): Promise<HealthCheckResponse> {
  return {
    ok: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  };
}

export const main = healthCheckMain;
