'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const ERRORS: Record<string, { title: string; desc: string }> = {
  Configuration:   { title: 'Error de configuración', desc: 'El proveedor de inicio de sesión no está configurado correctamente. Usa el enlace mágico por correo mientras tanto.' },
  AccessDenied:    { title: 'Acceso denegado',         desc: 'No tienes permiso para acceder con esta cuenta.' },
  Verification:    { title: 'Enlace expirado',          desc: 'El enlace de verificación ya expiró o fue usado. Solicita uno nuevo.' },
  OAuthCallback:   { title: 'Error con Google',         desc: 'No se pudo completar el inicio de sesión con Google. Intenta con el enlace mágico por correo.' },
  OAuthSignin:     { title: 'Error con Google',         desc: 'No se pudo iniciar sesión con Google. Verifica que las credenciales OAuth estén configuradas.' },
  Default:         { title: 'Error de autenticación',   desc: 'Ocurrió un error inesperado. Intenta de nuevo.' },
};

export default function AuthErrorPage() {
  const params = useSearchParams();
  const code = params.get('error') ?? 'Default';
  const cfg = ERRORS[code] ?? ERRORS.Default;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold text-white mb-2">{cfg.title}</h1>
      <p className="text-sm text-gray-400 max-w-xs mb-8">{cfg.desc}</p>
      <Link href="/auth/signin"
        className="px-6 py-3 rounded-xl text-sm font-bold text-black"
        style={{ backgroundColor: '#D4AF37' }}>
        Volver al inicio de sesión
      </Link>
      <Link href="/" className="mt-4 text-xs text-gray-600 hover:text-gray-400 transition-colors">
        Ir al inicio
      </Link>
    </div>
  );
}
