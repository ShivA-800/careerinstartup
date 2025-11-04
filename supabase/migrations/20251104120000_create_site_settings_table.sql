-- Create a simple key/value table for site-editable settings (privacy, terms, contact email, footer text)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text not null,
  updated_at timestamptz DEFAULT now()
);

-- Insert some default values (can be updated via admin UI)
INSERT INTO public.site_settings (key, value) VALUES
  ('contact_email', 'shivacherry800888@gmail.com')
  ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value) VALUES
  ('privacy', 'This is the privacy policy. Edit from the admin panel.' )
  ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value) VALUES
  ('terms', 'These are the terms and conditions. Edit from the admin panel.')
  ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value) VALUES
  ('footer_text', 'Connecting founders, builders and opportunities globally.')
  ON CONFLICT (key) DO NOTHING;
