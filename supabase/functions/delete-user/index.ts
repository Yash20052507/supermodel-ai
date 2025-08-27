// supabase/functions/delete-user/index.ts
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Standard Supabase function boilerplate
Deno.serve(async (req: Request) => {
  // 1. Check for the correct HTTP method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Create a Supabase client with the user's authorization header.
    // This authenticates the request and identifies the user.
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 3. Get the user's data from the JWT.
    const { data: { user } } = await userSupabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found or unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Create a Supabase client with the SERVICE_ROLE_KEY.
    // This admin client has the necessary privileges to delete a user from the `auth.users` table.
    // This is the *only* secure way to perform this action.
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 5. Perform the deletion using the admin client.
    const { error: deleteError } = await adminSupabaseClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      throw deleteError;
    }

    // 6. Return a success response.
    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // 7. Handle any errors that occur during the process.
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/*
To deploy this function:
1. Make sure you have the Supabase CLI installed.
2. Run `supabase login`.
3. Run `supabase link --project-ref <your-project-ref>`.
4. Run `supabase functions deploy delete-user --no-verify-jwt`.
   (The JWT is verified manually in the function code.)
5. Make sure to set the `SUPABASE_SERVICE_ROLE_KEY` secret:
   `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`
*/