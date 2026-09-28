-- 1. Delete the passenger profile
DELETE FROM public.passenger 
WHERE contact_number IN ('09606938525', '+639606938525', '639606938525');

-- 2. Delete the user from the Supabase Authentication system
DELETE FROM auth.users 
WHERE phone IN ('09606938525', '+639606938525', '639606938525')
OR email IN (
    'passenger_+639606938525@sakay.ph',
    'passenger_09606938525@sakay.ph',
    'passenger_639606938525@sakay.ph',
    'test_+639606938525@sakay.ph',
    '+639606938525@sakay.ph'
);
