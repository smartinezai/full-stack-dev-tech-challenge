import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

type SliderNativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
>

export interface SliderProps extends SliderNativeProps {
  value: number
  onValueChange?: (value: number) => void
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, min = 0, max = 1, step = 0.01, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="range"
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-700',
          className,
        )}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          onValueChange?.(event.currentTarget.valueAsNumber)
        }}
        {...props}
      />
    )
  },
)
Slider.displayName = 'Slider'
