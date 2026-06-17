import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

// --- 型別定義 ---
interface FormData {
  name: string
  textarea: string
  select: string
  file: File | null
  fileName: string
  radio: string
  checkbox: string[]
}

type FormKey = keyof FormData

// 運用 Discriminated Unions 確保 options 的型別安全
type FieldConfig =
  | { key: FormKey; label: string; type: 'text' | 'textarea' | 'file'; errorText?: string }
  | { key: FormKey; label: string; type: 'select' | 'checkbox'; options: string[]; errorText?: string }
  | { key: FormKey; label: string; type: 'radio'; options: { value: string; label: string }[]; errorText?: string }

type Errors = Partial<Record<FormKey, string>>

const STORAGE_KEY = 'formCookie'

const DEFAULT_DATA: FormData = {
  name: '',
  textarea: '',
  select: '',
  file: null,
  fileName: '',
  radio: '',
  checkbox: [],
}

const STEPS: { title: string; fields: FieldConfig[] }[] = [
  {
    title: '步驟一',
    fields: [
      { key: 'name', label: '文字', type: 'text', errorText: '請輸入文字' },
      { key: 'textarea', label: '多行', type: 'textarea', errorText: '請輸入文字' },
    ],
  },
  {
    title: '步驟二',
    fields: [
      {
        key: 'select',
        label: '下拉',
        type: 'select',
        options: ['項目一', '項目二', '項目三', '項目四', '項目五'],
        errorText: '請選擇類別',
      },
      { key: 'file', label: '檔案', type: 'file', errorText: '請上傳檔案' },
    ],
  },
  {
    title: '步驟三',
    fields: [
      {
        key: 'radio',
        label: '單選',
        type: 'radio',
        options: [
          { value: 'radio1', label: '項目一' },
          { value: 'radio2', label: '項目二' },
          { value: 'radio3', label: '項目三' },
        ],
        errorText: '請選擇項目',
      },
      {
        key: 'checkbox',
        label: '多選',
        type: 'checkbox',
        options: ['項目一', '項目二', '項目三', '項目四', '項目五', '項目六'],
        errorText: '請至少選擇一項',
      },
    ],
  },
]

// --- 工具函數 ---
function save(step: number, data: FormData) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ step, data: { ...data, file: null } }),
    )
  } catch (e) {
    console.error('Failed to save form state', e)
  }
}

function load(): { step: number; data: FormData } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clear() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export const Route = createFileRoute('/form/')({
  component: FormPage,
})

// --- 主元件 ---
function FormPage() {
  // 使用 Lazy Initial State，避免每次 render 都去讀取 sessionStorage
  const [saved] = useState(() => load())
  const [step, setStep] = useState(saved?.step ?? 0)
  const [formData, setFormData] = useState<FormData>(() => ({
    ...DEFAULT_DATA,
    ...saved?.data,
  }))
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)

  // 效能優化：不再用 useEffect 監聽 formData 狂寫 Storage。
  // 改為「當使用者要離開/重新整理時」才把當前最新狀態存進去
  useEffect(() => {
    const handleBeforeUnload = () => {
      save(step, formData)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [step, formData])

  const handleChange = useCallback(<K extends FormKey>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    setErrors(prev => {
      if (!prev[key]) return prev // 如果本來就沒錯誤，不觸發重新渲染
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleFile = useCallback((file: File) => {
    setFormData(prev => ({ ...prev, file, fileName: file.name }))
    setErrors(prev => {
      const next = { ...prev }
      delete next.file
      return next
    })
  }, [])

  const toggleCheckbox = useCallback((value: string) => {
    setFormData(prev => {
      const nextCheckbox = prev.checkbox.includes(value)
        ? prev.checkbox.filter(i => i !== value)
        : [...prev.checkbox, value]
      return { ...prev, checkbox: nextCheckbox }
    })
    setErrors(prev => {
      const next = { ...prev }
      delete next.checkbox
      return next
    })
  }, [])

  const validate = (stepIndex: number): Errors => {
    const fields = STEPS[stepIndex].fields
    const e: Errors = {}

    fields.forEach(field => {
      const value = formData[field.key]
      if (!field.errorText) return

      let hasError = false
      if (field.key === 'checkbox') {
        hasError = formData.checkbox.length === 0
      } else if (field.key === 'file') {
        hasError = !formData.fileName
      } else {
        hasError = !String(value ?? '').trim()
      }

      if (hasError) {
        e[field.key] = field.errorText
      }
    })

    return e
  }

  const next = () => {
    const e = validate(step)
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    setErrors({})
    const nextStep = step + 1
    setStep(nextStep)
    save(nextStep, formData) // 切換步驟時主動存檔
  }

  const back = () => {
    const prevStep = step - 1
    setStep(prevStep)
    setErrors({})
    save(prevStep, formData) // 切換步驟時主動存檔
  }

  const submit = () => {
    const e = validate(step)
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    console.log('submit:', formData)
    clear()
    setSubmitted(true)
  }

  const reset = () => {
    setFormData(DEFAULT_DATA)
    setStep(0)
    setErrors({})
    setSubmitted(false)
    clear()
  }

  if (submitted) {
    return (
      <main className="max-w-md mx-auto pt-10 px-4">
        <h2 className="text-green-600 font-bold mb-4 text-xl">送出成功</h2>
        <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
          {JSON.stringify(formData, null, 2)}
        </pre>
        <div className="flex gap-4 pt-4">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 text-white rounded bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            重新填寫
          </button>
        </div>
      </main>
    )
  }

  const currentStep = STEPS[step]

  return (
    <main className="max-w-md mx-auto pt-10 space-y-4 px-4">
      <h2 className="font-bold text-lg">{currentStep.title}</h2>

      <div className="space-y-4">
        {currentStep.fields.map(field => (
          <FormField
            key={field.key}
            field={field}
            formData={formData}
            error={errors[field.key]}
            onChange={handleChange}
            onFileChange={handleFile}
            onCheckboxChange={toggleCheckbox}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-4">
        {step > 0 && (
          <button onClick={back} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded transition-colors">
            上一步
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button onClick={next} className="flex-1 px-4 py-2 text-white rounded bg-blue-600 hover:bg-blue-700 transition-colors">
            下一步
          </button>
        ) : (
          <button onClick={submit} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded transition-colors">
            送出
          </button>
        )}
      </div>
    </main>
  )
}

// --- 子元件：負責個別欄位的渲染 ---
interface FormFieldProps {
  field: FieldConfig
  formData: FormData
  error?: string
  onChange: <K extends FormKey>(key: K, value: FormData[K]) => void
  onFileChange: (file: File) => void
  onCheckboxChange: (value: string) => void
}

function FormField({ field, formData, error, onChange, onFileChange, onCheckboxChange }: FormFieldProps) {
  const value = formData[field.key]
  const hasError = !!error
  const inputBaseClass = `w-full border rounded-lg px-3 py-2 transition-colors ${hasError ? 'border-red-500 focus:outline-red-500' : 'border-gray-200 focus:border-blue-500'
    }`

  return (
    <div className="space-y-1">
      {(() => {
        switch (field.type) {
          case 'text':
            return (
              <input
                type="text"
                value={value as string}
                placeholder={field.label}
                onChange={e => onChange(field.key, e.target.value)}
                className={inputBaseClass}
              />
            )

          case 'textarea':
            return (
              <textarea
                placeholder={field.label}
                value={value as string}
                onChange={e => onChange(field.key, e.target.value)}
                className={inputBaseClass}
                rows={3}
              />
            )

          case 'select':
            return (
              <select
                value={value as string}
                onChange={e => onChange(field.key, e.target.value)}
                className={inputBaseClass}
              >
                <option value="">請選擇{field.label}</option>
                {field.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )

          case 'file':
            return (
              <label
                className={`flex flex-col items-center justify-center border rounded-lg p-6 cursor-pointer transition-colors ${hasError ? 'border-red-500 bg-red-50/10' : 'border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <span className="text-sm text-gray-500">{formData.fileName || '點擊選擇或拖曳檔案'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && onFileChange(e.target.files[0])}
                />
              </label>
            )

          case 'radio':
            return (
              <div className="space-y-2">
                <label className="block text-sm text-gray-600 font-medium">
                  {field.label}<span className="text-red-500 px-1">*</span>
                </label>
                <div className="flex gap-4">
                  {field.options.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        checked={formData.radio === opt.value}
                        onChange={() => onChange('radio', opt.value)}
                        className="accent-blue-500 h-4 w-4"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )

          case 'checkbox':
            return (
              <div className="space-y-2">
                <label className="block text-sm text-gray-600 font-medium">
                  {field.label}<span className="text-red-500 px-1">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {field.options.map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm transition-colors ${formData.checkbox.includes(opt) ? 'bg-blue-50 border-blue-200' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.checkbox.includes(opt)}
                        onChange={() => onCheckboxChange(opt)}
                        className="accent-blue-500 h-4 w-4"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            )

          default:
            return null
        }
      })()}
      {hasError && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}