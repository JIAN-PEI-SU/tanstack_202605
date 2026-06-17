import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getCookies } from '@tanstack/react-start/server'
import { useState } from 'react'

const cookieName = 'formCookie'

interface FormData {
  name: string
  phone: string
  gender: string
}

const defaultData: FormData = { name: '', phone: '', gender: '' }

const fetchFormDataFromCookie = createServerFn({ method: 'GET' })
  .handler(async () => {
    const cookies = getCookies()
    const rawCookie = cookies[cookieName]
    const data = rawCookie ? JSON.parse(decodeURIComponent(rawCookie)) : defaultData
    return data
  })

export const Route = createFileRoute('/form/')({
  beforeLoad: async () => {
    const initialFormData = await fetchFormDataFromCookie()
    return {
      initialFormData,
    }
  },
  component: FormPage,
})

function FormPage() {
  const { initialFormData } = Route.useRouteContext()
  const [formData, setFormData] = useState<FormData>(initialFormData)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const nextData = { ...formData, [name]: value }

    setFormData(nextData)
    document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(nextData))}; path=/; max-age=86400;`
  }

  const handleGenderChange = (genderValue: string) => {
    const nextData = {
      ...formData,
      gender: formData.gender === genderValue ? '' : genderValue,
    }

    setFormData(nextData)
    document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(nextData))}; path=/; max-age=86400;`
  }

  const handleClean = () => {
    setFormData(defaultData)
    document.cookie = `${cookieName}=; path=/; max-age=0;`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {

      console.log('Server 已經成功收到資料：', formData)
      alert('送出成功！')

      // 🎯 【關鍵就在這】確定 Server 成功執行完後，才執行以下清除動作：
      setFormData(defaultData)                  // 1. 更新元件狀態（清空畫面）
      document.cookie = `${cookieName}=; path=/; max-age=0;` // 2. 清除 Cookie

    } catch (error) {
      console.error('送出失敗：', error)
      alert('送出失敗，請稍後再試。')
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">作業表單</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">姓名：</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            placeholder="請輸入姓名"
          />
        </div>

        <div>
          <label className="block mb-1">電話：</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            placeholder="請輸入電話"
          />
        </div>

        <div>
          <label className="block mb-1">性別：</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.gender === 'male'}
                onChange={() => handleGenderChange('male')}
              />
              男生
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.gender === 'female'}
                onChange={() => handleGenderChange('female')}
              />
              女生
            </label>
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <button
            type="button"
            onClick={handleClean}
            className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded text-center"
          >
            清除
          </button>

          <button
            type="submit"
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded text-center"
          >
            送出
          </button>
        </div>
      </form>
    </main>
  )
}