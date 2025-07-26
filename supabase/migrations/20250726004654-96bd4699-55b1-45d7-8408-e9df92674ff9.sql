-- Assign admin role to hyaghi@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('1cf93cf1-d56f-4907-b183-a1b6930ee80d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;