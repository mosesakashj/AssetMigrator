interface FormFieldProps {
  label: string
  required?: boolean
  autoTag?: boolean
  children: React.ReactNode
}

export function FormField({ label, required, autoTag, children }: FormFieldProps) {
  return (
    <div className="mb-3.5">
      <div className="flex items-center gap-1 text-xs font-bold text-neutral-500 mb-1.5">
        {label}
        {required && <span className="text-error-500">*</span>}
        {autoTag && (
          <span className="text-[9.5px] font-extrabold text-success-600 bg-success-50 border border-green-200 rounded-full px-1.5 py-px tracking-wide ml-1">
            AUTO
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  autofilled?: boolean
}

export function TextInput({ autofilled, className = '', ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-3 border-[1.5px] rounded-md text-sm font-medium outline-none transition-colors ${
        autofilled
          ? 'border-green-300 bg-success-50 text-neutral-900'
          : 'border-neutral-200 bg-white text-neutral-900 focus:border-primary-600 focus:shadow-[0_0_0_3px_rgba(194,26,127,0.08)]'
      } ${className}`}
    />
  )
}

export function TextArea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3.5 py-3 border-[1.5px] border-neutral-200 bg-white rounded-md text-sm font-medium outline-none transition-colors focus:border-primary-600 resize-none ${className}`}
    />
  )
}
