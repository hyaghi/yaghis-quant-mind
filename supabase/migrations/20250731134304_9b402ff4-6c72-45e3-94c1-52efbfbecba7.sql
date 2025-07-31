-- Setup admin user and create sample data
-- This will automatically assign admin role to sammyaghi@gmail.com when they sign up

-- Create a trigger function to automatically assign admin role to sammyaghi@gmail.com
CREATE OR REPLACE FUNCTION auto_assign_admin_role()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Check if this is sammyaghi@gmail.com
    IF NEW.email = 'sammyaghi@gmail.com' THEN
        -- Insert admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Create sample data for admin user
        PERFORM create_sample_scenarios(NEW.user_id);
        
        RAISE NOTICE 'Admin role and sample data created for: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to run when a new profile is created
CREATE OR REPLACE TRIGGER auto_admin_assignment
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_admin_role();

-- Now assign admin role to existing sammyaghi@gmail.com if they already exist
SELECT assign_admin_role_by_email('sammyaghi@gmail.com');