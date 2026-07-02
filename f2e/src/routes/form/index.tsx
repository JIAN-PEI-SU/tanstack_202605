import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getCookies } from '@tanstack/react-start/server'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FormData {
  name: string
  textarea: string
  select: string
  file: File | null
  fileName: string
  filePreview: string
  radio: string
  checkbox: { [key: string]: string | boolean; }
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
const CHECKBOX_OPTIONS = [
  { label: '項目一', value: '11' },
  { label: '項目二', value: '12' },
  { label: '項目三', value: '13' },
  { label: '項目四', value: '11' },
  { label: '項目五', value: '12' },
  { label: '項目六', value: '13' },
]
const DEFAULT_DATA: FormData = {
  name: '',
  textarea: '',
  select: '',
  file: null,
  fileName: '',
  filePreview: '',
  radio: '',
  checkbox: Object.fromEntries(CHECKBOX_OPTIONS.map(opt => [opt.label, false])),
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
        options: CHECKBOX_OPTIONS,
        errorText: '請至少選擇一項',
      },
    ],
  },
]

function clearCookie() {
  document.cookie = `${STORAGE_KEY}=; path=/; max-age=0;`
}
function saveCookie(step: number, data: FormData) {
  const storageData = encodeURIComponent(JSON.stringify({
    step,
    data: { ...data, file: null },
  }))
  document.cookie = `${STORAGE_KEY}=${storageData}; path=/; max-age=86400;`
}

export const fetchCookie = createServerFn().handler(async () => {
  const cookies = getCookies()
  const rawCookie = cookies[STORAGE_KEY]
  const data = rawCookie ? JSON.parse(decodeURIComponent(rawCookie)) : null
  return { _cookie: data }
})

export const Route = createFileRoute('/form/')({
  beforeLoad: async () => {
    const initialFormData = await fetchCookie()
    return {
      initialFormData,
    }
  },
  component: FormPage,
})

// 定義表單內容切換的動畫參數
const slideVariants: any = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -50 : 50,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' }
  }),
}

function FormPage() {
  const { initialFormData } = Route.useRouteContext()
  const [step, setStep] = useState(initialFormData?._cookie?.step ?? 0)
  // 用來控制切換方向：1 代表下一步（向左滑），-1 代表上一步（向右滑）
  const [direction, setDirection] = useState(0)
  const [formData, setFormData] = useState<FormData>(() => ({
    ...DEFAULT_DATA,
    ...initialFormData?._cookie?.data,
  }))
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    saveCookie(step, formData)
  }, [step, formData])

  const handleChange = (key: FormKey, rawValue: any) => {
    setFormData(prev => {
      if (key === 'file') {
        const file = rawValue as File | null
        return {
          ...prev,
          file,
          fileName: file ? file.name : '',
          filePreview: file ? URL.createObjectURL(file) : '',
        }
      }
      if (key === 'checkbox') {
        const item = rawValue
        return {
          ...prev,
          checkbox: {
            ...prev.checkbox,
            [item.label]: item.value,
          },
        }
      }
      return {
        ...prev,
        [key]: rawValue
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
      console.log(formData)
      const value = formData[field.key]
      if (!field.errorText) return
      let hasError = false
      if (field.key === 'checkbox') {
        const checked = Object.values(formData.checkbox).filter(value => value !== false)

        hasError = checked.length === 0
      } else if (field.key === 'file') {
        hasError = !formData.fileName
      } else {
        hasError = !String(value).trim()
      }
      if (hasError) e[field.key] = field.errorText
    })
    return e
  }

  const submitDate = (data: FormData) => {
    const submitFormDate = new FormData()
    submitFormDate.append('name', data.name)
    submitFormDate.append('textarea', data.textarea)
    submitFormDate.append('select', data.select)
    submitFormDate.append('radio', data.radio)
    if (data.file) submitFormDate.append('file', data.file)
    Object.entries(data.checkbox).forEach(([key, value]) => {
      submitFormDate.append(`checkbox[${key}]`, JSON.stringify(value))
    })
    console.log([...submitFormDate.entries()])
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
        setDirection(1)
        setStep((s: number) => s + 1)
        break

      case 'BACK':
        setDirection(-1)
        setStep((s: number) => s - 1)
        setErrors({})
        break

      case 'SUBMIT':
        submitDate(formData)
        clearCookie()
        setSubmitted(true)
        break

      case 'RESET':
        if (formData.filePreview) URL.revokeObjectURL(formData.filePreview)
        setFormData(DEFAULT_DATA)
        setStep(0)
        setDirection(0)
        setErrors({})
        setSubmitted(false)
        clearCookie()
        break
    }
  }

  if (submitted) {
    const selectedCheckboxes = Object.entries(formData.checkbox)
      .filter(([, v]) => v !== false)
      .map(([label, value]) => `${label} (${value})`)

    const radioLabel = STEPS
      .flatMap(s => s.fields)
      .find(f => f.key === 'radio')
      ?.options?.find((opt: any) => opt.value === formData.radio)?.label ?? formData.radio

    const summaryItems = [
      { label: '文字', value: formData.name },
      { label: '多行', value: formData.textarea },
      { label: '下拉', value: formData.select },
      { label: '單選', value: radioLabel },
      { label: '多選', list: selectedCheckboxes },
    ]

    return (
      <main className="max-w-2xl mx-auto pt-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="rounded-2xl shadow-sm border border-gray-100 p-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">送出成功</h2>
          </div>
          <div className="flex gap-10">
            <div className="shrink-0">
              {formData.filePreview && (
                <img
                  src={formData.filePreview}
                  className="w-40 h-40 rounded-lg object-cover border border-gray-100"
                />
              )}
              {formData.fileName && (
                <p className="text-xs text-gray-400 mt-1.5 w-40 truncate text-center">
                  {formData.fileName}
                </p>
              )}
            </div>
            <div className="flex-1 min-w-0 divide-y divide-gray-300">
              {summaryItems.map(item => (
                <div key={item.label} className="py-2.5 first:pt-0">
                  <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                  {item.list ? (
                    item.list.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.list.map((entry: string) => (
                          <span
                            key={entry}
                            className="text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-sm px-2 py-1"
                          >
                            {entry}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700">—</p>
                    )
                  ) : (
                    <p className="text-sm text-gray-700 wrap-break-word">{item.value || '—'}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 按鈕 */}
          <div className="pt-6">
            <button
              onClick={() => handleAction('RESET')}
              className="w-full px-4 py-2.5 text-white rounded-lg bg-(--sea-ink-soft) hover:bg-(--sea-ink) transition-colors"
            >
              重新填寫
            </button>
          </div>
        </motion.div>
      </main>
    )
  }

  const currentStep = STEPS[step]

  return (
    <main className="max-w-md mx-auto pt-40 space-y-4 overflow-x-hidden px-1">

      {/* 步驟進度條 */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <motion.div
                animate={{
                  backgroundColor: i < step ? 'var(--sea-ink)' : i === step ? 'var(--sea-ink-soft)' : 'rgba(0, 0, 0, 0)',
                  borderColor: i < step ? 'var(--sea-ink)' : i === step ? 'var(--sea-ink-soft)' : '#d1d5db',
                  color: i <= step ? '#fff' : '#9ca3af',
                }}
                transition={{ duration: 0.3 }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium border"
              >
                {i < step ? '✓' : i + 1}
              </motion.div>
              <span className="text-xs mt-1 text-gray-500">{label.title}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-2 mb-4 bg-gray-200 relative">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-(--sea-ink)"
                  initial={{ width: '0%' }}
                  animate={{ width: i < step ? '100%' : '0%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 表單內容切換動畫區塊 */}
      <div className="relative min-h-75">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-4"
          >
            {currentStep.fields.map(field => {
              const value = formData[field.key]
              const hasError = !!errors[field.key]
              return (
                <div key={field.key} className="space-y-1">
                  {(() => {
                    switch (field.type) {
                      case 'text':
                        return (
                          <div className="space-y-2">
                            <label className="block text-sm text-gray-600">
                              {field.label}<span className="text-red-500 px-2">*</span>
                            </label>
                            <input
                              value={value as string}
                              placeholder={field.label}
                              onChange={e => handleChange(field.key, e.target.value)}
                              className={`w-full border rounded-lg px-3 py-2 transition-colors ${hasError ? 'border-red-500 focus:outline-red-500' : 'border-gray-200'}`}
                            />
                          </div>
                        )

                      case 'textarea':
                        return (
                          <div className="space-y-2">
                            <label className="block text-sm text-gray-600">
                              {field.label}<span className="text-red-500 px-2">*</span>
                            </label>
                            <textarea
                              placeholder={field.label}
                              value={value as string}
                              onChange={e => handleChange(field.key, e.target.value)}
                              className={`w-full border rounded-lg px-3 py-2 transition-colors ${hasError ? 'border-red-500 focus:outline-red-500' : 'border-gray-200'}`}
                            />
                          </div>
                        )

                      case 'select':
                        return (
                          <div className="space-y-2">
                            <label className="block text-sm text-gray-600">
                              {field.label}<span className="text-red-500 px-2">*</span>
                            </label>
                            <select
                              value={value as string}
                              onChange={e => handleChange(field.key, e.target.value)}
                              className={`border p-2 w-full rounded transition-colors ${hasError ? 'border-red-500 focus:outline-red-500' : 'border-gray-200'}`}
                            >
                              <option value="">請選擇{field.label}</option>
                              {field.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        )

                      case 'file':
                        return (
                          <div className="space-y-2">
                            <label className="block text-sm text-gray-600">
                              {field.label}<span className="text-red-500 px-2">*</span>
                            </label>
                            <label
                              className={`relative flex flex-col items-center justify-center border rounded p-6 cursor-pointer transition-colors ${hasError ? 'border-red-500 bg-red-50/10' : 'border-gray-200'}`}
                            >
                              {formData.filePreview ? (<img src={formData.filePreview} className="max-h-40 object-contain rounded" />) : (<span className="text-sm text-gray-500">點擊選擇或拖曳檔案</span>)}
                              {formData.fileName && (<span className="text-xs text-gray-400 mt-2">{formData.fileName}</span>)}
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0"
                                onChange={e => e.target.files?.[0] && handleChange('file', e.target.files[0])}
                              />
                            </label>
                          </div>
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
                            {field.options?.map((opt: any) => (
                              <label
                                key={opt.label}
                                className={`flex items-center gap-3 p-3 border rounded transition-colors ${hasError ? 'border-red-500' : 'border-gray-200'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.checkbox[opt.label] !== false}
                                  onChange={() => handleChange('checkbox', { label: opt.label, value: formData.checkbox[opt.label] ? false : opt.value })}
                                />
                                {opt.label}
                                {formData.checkbox[opt.label]}
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
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 按鈕 */}
      <div className="flex gap-2 pt-2">
        {step > 0 && (
          <button
            onClick={() => handleAction('BACK')}
            className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded transition-colors"
          >
            上一步
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => handleAction('NEXT')}
            className="flex-1 px-4 py-2 text-white rounded bg-(--sea-ink-soft) hover:bg-(--sea-ink) transition-colors"
          >
            下一步
          </button>
        ) : (
          <button
            onClick={() => handleAction('SUBMIT')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded transition-colors"
          >
            送出
          </button>
        )}
      </div>
    </main>
  )
}