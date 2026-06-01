export interface ServiceResponse<T=void>{
    success: boolean;
    data?: T;
    error?: string;
}

export interface KafkaMessage<T>{
    topic: string;
    partition: number;
    offset: string;
    timestamp: string;
    value: T;
}

export interface SagaStateRecord{
    orderID: string;
    currentStep: string;
    status: string;
    payload: Record<string, unknown>;
    uploadedAt: Date;
    createdAt: Date;
    completedAt?: Date;
}

export interface HealthCheckResponse{
    status: 'ok' | 'degraded' | 'down';
    service: string;
    timestamp: string;
    checks: {
        database: 'ok' | 'error';
        kafka: 'ok' | 'error';
    };
}