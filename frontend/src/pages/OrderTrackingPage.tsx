import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderStatus } from '../api/client';
import { OrderStepper } from '../components/OrderStepper';
import { OrderStatus } from '../types';
import { Header } from '../components/Header';
import { 
  ArrowLeft, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle2, 
  UtensilsCrossed, 
  ShieldAlert,
  Copy,
  Check
} from 'lucide-react';

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState(false);

  // TanStack Query for polling order status every 2500ms
  const { data: orderData, isLoading, isError, error } = useQuery({
    queryKey: ['orderStatus', orderId],
    queryFn: () => fetchOrderStatus(orderId!),
    enabled: !!orderId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling when order status is COMPLETED, FAILED, or COMPENSATING
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'COMPENSATING') {
        return false;
      }
      return 2500;
    },
    staleTime: 0,
    retry: 1,
  });

  const handleCopyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const status: OrderStatus | undefined = orderData?.status;
  const isFailedOrCompensating = status === 'FAILED' || status === 'COMPENSATING';
  const isCompleted = status === 'COMPLETED';
  const isPolling = !isCompleted && !isFailedOrCompensating && !!status;

  const shortenedOrderId = orderId ? `${orderId.substring(0, 8)}...` : 'Unknown';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        
        {/* Navigation & Header Info */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Menu</span>
          </button>

          {/* Live Polling Status Indicator */}
          {isPolling && (
            <div className="flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 border border-orange-100">
              <RotateCw className="h-3.5 w-3.5 animate-spin text-orange-500" />
              <span>Updating live status...</span>
            </div>
          )}
        </div>

        {/* Order Details Card Header */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Order ID</span>
                <span className="font-mono text-sm font-bold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                  {shortenedOrderId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Copy Full Order ID"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Placed at: {orderData ? new Date(orderData.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
              </p>
            </div>

            {/* Current Status Pill */}
            {status && (
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm ${
                    isCompleted
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : isFailedOrCompensating
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-orange-100 text-orange-800 border border-orange-200'
                  }`}
                >
                  {isPolling && <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />}
                  {status}
                </span>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <RotateCw className="h-8 w-8 text-orange-500 animate-spin" />
              <p className="text-sm font-semibold text-gray-700">Connecting to Saga Orchestrator...</p>
              <p className="text-xs text-gray-400">Fetching order processing status</p>
            </div>
          )}

          {/* Error Fetching State */}
          {isError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
              <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
              <h3 className="text-base font-bold text-red-900">Order Not Found or Gateway Offline</h3>
              <p className="text-xs text-red-700 max-w-md mx-auto">
                {(error as Error)?.message || 'Could not fetch order status from http://localhost:3000'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
              >
                Return to Home
              </button>
            </div>
          )}

          {/* Main Tracking Content */}
          {status && (
            <>
              {/* FAILED / COMPENSATING State Card */}
              {isFailedOrCompensating ? (
                <div className="rounded-2xl border-2 border-red-500 bg-red-50/50 p-6 text-center space-y-4 shadow-sm animate-in fade-in duration-300">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <ShieldAlert className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-red-900">Order Failed</h2>
                    <p className="mt-1 text-sm font-medium text-red-700">
                      {orderData?.failureReason || 'Your order could not be completed.'}
                    </p>
                  </div>

                  <div className="inline-block rounded-xl bg-red-100/80 px-4 py-2 text-xs font-bold text-red-800 border border-red-200">
                    💳 A refund has been initiated.
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-95"
                    >
                      <UtensilsCrossed className="h-4 w-4" />
                      <span>Order Again</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Stepper Component for Normal Flow */
                <div className="space-y-6">
                  <OrderStepper status={status} currentStepName={orderData?.currentStep} />

                  {/* COMPLETED State Card */}
                  {isCompleted && (
                    <div className="rounded-2xl border-2 border-green-500 bg-green-50/50 p-6 text-center space-y-4 shadow-sm animate-in fade-in duration-300">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-green-900">Order Confirmed! 🎉</h2>
                        <p className="mt-1 text-sm font-medium text-green-700">
                          Your rider is on the way.
                        </p>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => navigate('/')}
                          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-95"
                        >
                          <UtensilsCrossed className="h-4 w-4" />
                          <span>Order Again</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>

      </main>
    </div>
  );
};
