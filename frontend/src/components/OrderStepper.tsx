import React from 'react';
import { CreditCard, Store, Bike, PackageCheck, Check } from 'lucide-react';
import { OrderStatus } from '../types';

interface OrderStepperProps {
  status: OrderStatus;
  currentStepName?: string | null;
}

interface StepDefinition {
  id: number;
  label: string;
  sublabel: string;
  icon: React.ElementType;
}

const STEPS: StepDefinition[] = [
  { id: 1, label: 'Payment', sublabel: 'Processing payment', icon: CreditCard },
  { id: 2, label: 'Restaurant', sublabel: 'Confirming order', icon: Store },
  { id: 3, label: 'Rider', sublabel: 'Assigning delivery partner', icon: Bike },
  { id: 4, label: 'Delivered', sublabel: 'Order completed', icon: PackageCheck },
];

export const OrderStepper: React.FC<OrderStepperProps> = ({ status }) => {
  // Determine current active step index (1-based)
  const getActiveStepNumber = (s: OrderStatus): number => {
    switch (s) {
      case 'PENDING':
      case 'PAYMENT_PROCESSING':
      case 'PAYMENT_SUCCESS':
        return 1;
      case 'RESTAURANT_CONFIRMING':
        return 2;
      case 'RIDER_ASSIGNING':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 1;
    }
  };

  const activeStep = getActiveStepNumber(status);
  const isAllCompleted = status === 'COMPLETED';

  return (
    <div className="w-full py-4">
      {/* Desktop & Tablet Stepper (Horizontal Layout) */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute top-6 left-8 right-8 h-1 bg-gray-200 -z-0" />
        
        {/* Active Progress Line */}
        <div
          className="absolute top-6 left-8 h-1 bg-orange-500 transition-all duration-500 ease-in-out -z-0"
          style={{
            width: isAllCompleted
              ? 'calc(100% - 4rem)'
              : `calc(${((activeStep - 1) / (STEPS.length - 1)) * 100}% - 2rem)`,
          }}
        />

        {STEPS.map((step) => {
          const isCompleted = isAllCompleted || step.id < activeStep;
          const isActive = !isAllCompleted && step.id === activeStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              {/* Step Circle */}
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : isActive
                    ? 'border-orange-500 bg-white text-orange-500 ring-4 ring-orange-100 animate-pulse'
                    : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6 stroke-[2.5]" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Step Label */}
              <div className="mt-3 text-center">
                <p
                  className={`text-xs font-bold transition-colors ${
                    isCompleted || isActive ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  Step {step.id}: {step.label}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 max-w-[100px] leading-tight">
                  {step.sublabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper (Vertical Layout) */}
      <div className="sm:hidden space-y-4">
        {STEPS.map((step, index) => {
          const isCompleted = isAllCompleted || step.id < activeStep;
          const isActive = !isAllCompleted && step.id === activeStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative flex items-start gap-4">
              {/* Vertical connecting line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`absolute left-5 top-10 bottom-0 w-0.5 ${
                    isCompleted ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* Step Circle */}
              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  isCompleted
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : isActive
                    ? 'border-orange-500 bg-white text-orange-500 ring-4 ring-orange-100 animate-pulse'
                    : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 stroke-[2.5]" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              {/* Step Content */}
              <div className="pt-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${
                      isCompleted || isActive ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 animate-pulse">
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{step.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
