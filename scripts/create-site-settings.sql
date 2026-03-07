-- Tabla para configuracion del sitio (redes sociales, links, etc.)
-- Solo super admins pueden editar

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insertar configuracion inicial de redes sociales
INSERT INTO site_settings (key, value) VALUES 
  ('social_links', '{
    "instagram": "https://instagram.com/peloteras",
    "facebook": "https://facebook.com/peloteras",
    "tiktok": "https://tiktok.com/@peloteras"
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Insertar configuracion de links del footer
INSERT INTO site_settings (key, value) VALUES 
  ('footer_links', '{
    "about": "/sobre-peloteras",
    "register_event": "/como-inscribir-nuevo-evento",
    "contact": "/contactanos"
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS: Todos pueden leer, solo authenticated pueden escribir (validacion de superadmin en API)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site_settings" 
  ON site_settings FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can update site_settings" 
  ON site_settings FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Trigger para actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();
