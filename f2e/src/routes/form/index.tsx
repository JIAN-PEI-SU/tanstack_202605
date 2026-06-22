import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getCookies } from '@tanstack/react-start/server'
import { useEffect, useState } from 'react'

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
type FieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file'
type FormAction = 'NEXT' | 'BACK' | 'SUBMIT' | 'RESET'
interface FieldConfig {
  key: FormKey
  label: string
  type: FieldType
  options?: any[]
  errorText?: string
}

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
//---
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
//---
function save(step: number, data: FormData) {
  const storageData = JSON.stringify({
    step,
    data: { ...data, file: null },
  })
  document.cookie = `${STORAGE_KEY}=${storageData}; path=/; max-age=86400;`
}
const fetchFormDataFromCookie = createServerFn({ method: 'GET' })
  .handler(async () => {
    const cookies = getCookies()
    const rawCookie = cookies[STORAGE_KEY]
    const data = rawCookie ? JSON.parse(rawCookie) : null
    return data
  })
function clear() {
  document.cookie = `${STORAGE_KEY}=; path=/; max-age=0;`
}

// 把 File 物件轉成 Base64 字串的函式
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}
//---
export const Route = createFileRoute('/form/')({
  beforeLoad: async () => {
    const initialFormData = await fetchFormDataFromCookie()
    return {
      initialFormData,
    }
  },
  component: FormPage,
})
//---
function FormPage() {
  const { initialFormData } = Route.useRouteContext()
  const [step, setStep] = useState(initialFormData?.step ?? 0)
  const [formData, setFormData] = useState<FormData>(() => ({
    ...DEFAULT_DATA,
    ...initialFormData?.data,
  }))
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  console.log(initialFormData)

  useEffect(() => {
    save(step, formData)
  }, [step, formData])


  const handleChange = (key: FormKey, rawValue: any) => {
    setFormData(prev => {
      let nextValue = rawValue

      if (key === 'file') {
        const file = rawValue as File | null
        console.log(file)
        console.log(rawValue)
        return {
          ...prev,
          file: file,
          fileName: file ? file.name : '',
        }
      }
      if (key === 'checkbox') {
        const item = rawValue as string
        const currentList = prev.checkbox
        const updatedList = currentList.includes(item)
          ? currentList.filter(i => i !== item)
          : [...currentList, item]

        return { ...prev, checkbox: updatedList }
      }
      return {
        ...prev,
        [key]: nextValue,
      }
    })
    setErrors(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

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
        hasError = !String(value).trim()
      }
      if (hasError) e[field.key] = field.errorText
    })
    return e
  }

  const handleAction = (action: FormAction) => {
    if (action === 'NEXT' || action === 'SUBMIT') {
      const e = validate(step)
      if (Object.keys(e).length > 0) {
        setErrors(e)
        return
      }
    }
    switch (action) {
      case 'NEXT':
        setStep((s: number) => s + 1)
        break

      case 'BACK':
        setStep((s: number) => s - 1)
        setErrors({})
        break

      case 'SUBMIT':
        console.log('submit:', formData)
        clear()
        setSubmitted(true)
        break

      case 'RESET':
        setFormData(DEFAULT_DATA)
        setStep(0)
        setErrors({})
        setSubmitted(false)
        clear()
        break
    }
  }


  if (submitted) {
    return (
      <main className="max-w-md mx-auto pt-10">
        <h2 className="font-bold mb-4">
          送出成功
        </h2>

        <pre className="text-xs bg-gray-100 p-3 rounded">
          {JSON.stringify(formData, null, 2)}
        </pre>
        <div className="flex gap-4 pt-2">
          <button
            onClick={() => handleAction('RESET')}
            className="flex-1 px-4 py-2 text-white rounded bg-(--sea-ink-soft) hover:bg-(--sea-ink)"
          >
            重新填寫
          </button>
        </div>
      </main>
    )
  }

  const currentStep = STEPS[step]

  return (
    <main className="max-w-md mx-auto pt-10 space-y-4">
      <h2 className="font-bold text-lg">
        {currentStep.title}
      </h2>
      {currentStep.fields.map(field => {
        const value = formData[field.key]
        const hasError = !!errors[field.key]
        return (
          <div key={field.key} className="space-y-1">
            {(() => {
              switch (field.type) {
                case 'text':
                  return (
                    <input
                      value={value as string}
                      placeholder={field.label}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 transition-colors ${hasError ? 'border-red-500 focus:outline-red-500' : 'border-gray-200'
                        }`}
                    />
                  )

                case 'textarea':
                  return (
                    <textarea
                      placeholder={field.label}
                      value={value as string}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 transition-colors ${hasError ? 'border-red-500 focus:outline-red-500' : 'border-gray-200'
                        }`}
                    />
                  )

                case 'select':
                  return (
                    <select
                      value={value as string}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className={`border p-2 w-full rounded transition-colors ${hasError ? 'border-red-500 focus:outline-red-500' : 'border-gray-200'
                        }`}
                    >
                      <option value="">請選擇{field.label}</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )

                case 'file':
                  return (
                    <label
                      className={`flex flex-col items-center justify-center border rounded p-6 cursor-pointer transition-colors ${hasError ? 'border-red-500 bg-red-50/10' : 'border-gray-200'
                        }`}
                    >
                      <span className="text-sm text-gray-500">{formData.fileName || '點擊選擇或拖曳檔案'}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleChange('file', e.target.files[0])}
                      />
                    </label>
                  )

                case 'radio':
                  return (
                    <div className="space-y-2">
                      <label className="block text-sm text-gray-600">
                        {field.label}<span className="text-red-500 px-2">*</span>
                      </label>
                      <div className="flex">
                        {field.options?.map((opt: any) => (
                          <label key={opt.value} className="flex items-center gap-3 px-3 cursor-pointer">
                            <input
                              type="radio"
                              checked={formData.radio === opt.value}
                              onChange={() => handleChange('radio', opt.value)}
                              className="accent-blue-500"
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
                      <label className="block text-sm text-gray-600">
                        {field.label}<span className="text-red-500 px-2">*</span>
                      </label>
                      {field.options?.map((opt: string) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 p-3 border rounded transition-colors ${hasError ? 'border-red-500' : 'border-gray-200'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.checkbox.includes(opt)}
                            onChange={() => handleChange('checkbox', opt)}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )

                default:
                  return null
              }
            })()}
            {hasError && (<p className="text-red-500 text-xs mt-1">{errors[field.key]}</p>)}
          </div>
        )
      })}
      {/* 按鈕 */}
      <div className="flex gap-2 pt-2">
        {step > 0 && (
          <button
            onClick={() => handleAction('BACK')}
            className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded"
          >
            上一步
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => handleAction('NEXT')}
            className="flex-1 px-4 py-2 text-white rounded bg-(--sea-ink-soft) hover:bg-(--sea-ink)"
          >
            下一步
          </button>
        ) : (
          <button
            onClick={() => handleAction('SUBMIT')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded"
          >
            送出
          </button>
        )}
      </div>
    </main>
  )
}