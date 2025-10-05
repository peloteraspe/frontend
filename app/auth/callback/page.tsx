'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SimpleAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('Procesando...');

  useEffect(() => {
    const handleCallback = async () => {
      console.log('🔄 Simple callback: Starting...');
      
      try {
        // Check for errors first
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
          console.error('❌ OAuth error:', error, errorDescription);
          setStatus(`Error: ${errorDescription || error}`);
          
          setTimeout(() => {
            router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`);
          }, 3000);
          return;
        }

        // If no error, just wait and redirect - let the AuthProvider handle the session
        setStatus('Autenticación exitosa, redirigiendo...');
        
        // Simple redirect after a delay to let auth state settle
        setTimeout(() => {
          router.push('/');
        }, 2000);

      } catch (error) {
        console.error('❌ Callback processing error:', error);
        setStatus('Error inesperado');
        
        setTimeout(() => {
          router.push('/login?error=' + encodeURIComponent('Error en el procesamiento'));
        }, 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Autenticación con Google
        </h2>
        
        <p className="text-gray-600 mb-4">
          {status}
        </p>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
        </div>
        
        <p className="text-sm text-gray-500 mt-4">
          Por favor espera mientras procesamos tu inicio de sesión...
        </p>

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-3 bg-gray-50 rounded text-xs text-left">
            <div className="font-mono">
              <div><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href.substring(0, 100) : 'Loading...'}...</div>
              <div><strong>Time:</strong> {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
