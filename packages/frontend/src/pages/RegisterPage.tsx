import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const DOMINIO = '@uniguajira.edu.co'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email().endsWith(DOMINIO, { message: `Usa tu correo ${DOMINIO}` }),
  password: z.string()
    .min(16, 'Mínimo 16 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe incluir al menos un símbolo (!@#$%...)'),
  facultad: z.string().optional(),
})
type Form = z.infer<typeof schema>

const FACULTADES = [
  'Ingeniería de Sistemas', 'Administración de Empresas', 'Contaduría Pública',
  'Derecho', 'Enfermería', 'Medicina', 'Licenciatura en Matemáticas', 'Otra',
]

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Form>({ resolver: zodResolver(schema) })
  const navigate = useNavigate()

  async function onSubmit(data: Form) {
    try {
      await axios.post('/api/auth/register', data)
      navigate('/verificar-email', { replace: true })
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : 'Error al registrarse'
      setError('root', { message: msg })
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Crear cuenta</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Solo correos {DOMINIO}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input {...register('nombre')} className="input" />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo institucional</label>
            <input {...register('email')} type="email" className="input" placeholder={`tu${DOMINIO}`} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input {...register('password')} type="password" className="input" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facultad (opcional)</label>
            <select {...register('facultad')} className="input">
              <option value="">Selecciona tu facultad</option>
              {FACULTADES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {errors.root && <p className="text-red-500 text-sm text-center">{errors.root.message}</p>}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          ¿Ya tienes cuenta? <Link to="/login" className="text-green-700 font-medium hover:underline">Ingresar</Link>
        </p>
      </div>
    </div>
  )
}
