import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string
  bio: string
  category: string
  file: File | null
  fileName: string
  gender: string
  interests: string[]
}

type FormKey = keyof FormData

interface FieldMeta {
  key: FormKey
  label: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COOKIE_NAME = 'formCookie'

const CATEGORIES = ['設計', '開發', '行銷', '管理', '其他']

const GENDERS = [
  { value: 'male', label: '男生' },
  { value: 'female', label: '女生' },
  { value: 'other', label: '其他' },
]

const INTERESTS = ['UI設計', '前端開發', '後端開發', '資料分析', '專案管理', '行銷企劃']

// Field metadata used for FormData assembly + summary
const FIELD_META: FieldMeta[] = [
  { key: 'name', label: '姓名' },
  { key: 'bio', label: '自我介紹' },
  { key: 'category', label: '類別' },
  { key: 'fileName', label: '上傳檔案' },
  { key: 'gender', label: '性別' },
  { key: 'interests', label: '興趣' },
]

const STEPS = ['基本資料', '詳細資訊', '個人偏好']

const DEFAULT_DATA: FormData = {
  name: '',
  bio: '',
  category: '',
  file: null,
  fileName: '',
  gender: '',
  interests: [],
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────
// sessionStorage → 瀏覽器關閉後自動清除（不需要設定 max-age）

function saveToSession(step: number, data: FormData) {
  const serialisable = { ...data, file: null }          // File 物件無法序列化
  sessionStorage.setItem(COOKIE_NAME, JSON.stringify({ step, data: serialisable }))
}

function loadFromSession(): { step: number; data: FormData } | null {
  try {
    const raw = sessionStorage.getItem(COOKIE_NAME)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clearSession() {
  sessionStorage.removeItem(COOKIE_NAME)
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/form/')({
  component: FormPage,
})

// ─── Component ────────────────────────────────────────────────────────────────

function FormPage() {
  const saved = loadFromSession()

  const [step, setStep] = useState<number>(saved?.step ?? 0)
  const [formData, setFormData] = useState<FormData>({ ...DEFAULT_DATA, ...saved?.data })
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({})
  const [submitted, setSubmitted] = useState(false)

  // ── 統一 change handler ──────────────────────────────────────────────────────

  const handleChange = useCallback(
    (key: FormKey, value: FormData[FormKey]) => {
      setFormData(prev => {
        const next = { ...prev, [key]: value }
        saveToSession(step, next)
        return next
      })
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    },
    [step],
  )

  // 原生 input / textarea / select onChange 包裝
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    handleChange(name as FormKey, value)
  }

  // checkbox 陣列 toggle
  const handleInterestToggle = (value: string) => {
    const next = formData.interests.includes(value)
      ? formData.interests.filter(i => i !== value)
      : [...formData.interests, value]
    handleChange('interests', next)
  }

  // 檔案上傳
  const handleFile = (file: File) => {
    handleChange('file', file)
    handleChange('fileName', file.name)
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (currentStep: number): boolean => {
    const e: Partial<Record<FormKey, string>> = {}

    if (currentStep === 0) {
      if (!formData.name.trim()) e.name = '請輸入姓名'
      if (!formData.bio.trim()) e.bio = '請輸入自我介紹'
    }

    if (currentStep === 1) {
      if (!formData.category) e.category = '請選擇類別'
      if (!formData.fileName) e.file = '請上傳檔案'
    }

    if (currentStep === 2) {
      if (!formData.gender) e.gender = '請選擇性別'
      if (!formData.interests.length) e.interests = '請至少選擇一項興趣'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (!validate(step)) return
    const nextStep = step + 1
    setStep(nextStep)
    saveToSession(nextStep, formData)
  }

  const handleBack = () => {
    const prevStep = step - 1
    setErrors({})
    setStep(prevStep)
    saveToSession(prevStep, formData)
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!validate(step)) return

    // 整理成陣列物件
    const dataArray = FIELD_META.map(({ key, label }) => {
      const { [key]: value, ...rest } = formData      // 解構
      return { key, label, value }
    })

    // 轉 FormData
    const fd = new FormData()
    dataArray.forEach(({ key, value }) => {
      if (key === 'file' && formData.file) {
        fd.append(key, formData.file)
      } else {
        fd.append(key, Array.isArray(value) ? value.join(',') : String(value ?? ''))
      }
    })

    // 送出（可替換成 API 呼叫）
    console.log('送出資料：', dataArray)
    console.table(dataArray.map(({ key, label, value }) => ({ key, label, value: Array.isArray(value) ? value.join('、') : value })))

    clearSession()
    setSubmitted(true)
  }

  const handleReset = () => {
    setFormData(DEFAULT_DATA)
    setErrors({})
    setStep(0)
    setSubmitted(false)
    clearSession()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <main className="page-wrap px-4 pb-8 pt-14 max-w-md mx-auto">
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h2 className="text-lg font-semibold mb-1">送出成功！</h2>
          <p className="text-sm text-gray-500 mb-6">你的資料已成功提交</p>
        </div>

        <div className="space-y-2 mb-6">
          {FIELD_META.map(({ key, label }) => {
            const value = formData[key]
            const display = Array.isArray(value) ? value.join('、') : String(value || '—')
            return (
              <div key={key} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-right max-w-[60%]">{display}</span>
              </div>
            )
          })}
        </div>

        <button
          onClick={handleReset}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
        >
          重新填寫
        </button>
      </main>
    )
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14 max-w-md mx-auto">
      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium border
                  ${i < step ? 'bg-green-500 border-green-500 text-white'
                    : i === step ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-gray-300 text-gray-400'}`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-xs mt-1 text-gray-500">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-4 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — input / textarea */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-sm text-gray-600">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="請輸入姓名"
              className={`border p-2 w-full rounded ${errors.name ? 'border-red-400' : ''}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block mb-1 text-sm text-gray-600">
              自我介紹 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="請簡短介紹自己…"
              rows={4}
              className={`border p-2 w-full rounded resize-y ${errors.bio ? 'border-red-400' : ''}`}
            />
            {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={handleNext}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
            >
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — select / file */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-sm text-gray-600">
              類別 <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={`border p-2 w-full rounded ${errors.category ? 'border-red-400' : ''}`}
            >
              <option value="">請選擇類別…</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>

          <div>
            <label className="block mb-1 text-sm text-gray-600">
              上傳檔案 <span className="text-red-500">*</span>
            </label>
            <label
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded p-6 cursor-pointer
                hover:border-blue-400 transition-colors
                ${errors.file ? 'border-red-400' : 'border-gray-300'}`}
            >
              <span className="text-3xl mb-2">📁</span>
              <span className="text-sm text-gray-500">
                {formData.fileName || '點擊選擇或拖曳檔案'}
              </span>
              {formData.fileName && (
                <span className="text-xs text-green-600 mt-1">✓ {formData.fileName}</span>
              )}
              <input
                type="file"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
            {errors.file && <p className="text-red-500 text-xs mt-1">{errors.file}</p>}
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={handleBack}
              className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded"
            >
              ← 上一步
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
            >
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — radio / checkbox */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm text-gray-600">
              性別 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {GENDERS.map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors
                    ${formData.gender === value ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={value}
                    checked={formData.gender === value}
                    onChange={handleInputChange}
                    className="accent-blue-500"
                  />
                  {label}
                </label>
              ))}
            </div>
            {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
          </div>

          <div>
            <label className="block mb-2 text-sm text-gray-600">
              興趣（可複選）<span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {INTERESTS.map(interest => (
                <label
                  key={interest}
                  className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors
                    ${formData.interests.includes(interest) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(interest)}
                    onChange={() => handleInterestToggle(interest)}
                    className="accent-blue-500"
                  />
                  {interest}
                </label>
              ))}
            </div>
            {errors.interests && <p className="text-red-500 text-xs mt-1">{errors.interests}</p>}
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={handleBack}
              className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded"
            >
              ← 上一步
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded"
            >
              ✓ 送出
            </button>
          </div>
        </div>
      )}
    </main>
  )
}