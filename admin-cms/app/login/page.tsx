'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'nextjs-toploader/app';

import { loginSchema, LoginSchema } from "@/lib/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");

  const router = useRouter()

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "", email : "", password : ""
    },
  })

  const searchParams = useSearchParams()

  // useEffect(() => {
  //     const reason = searchParams.get("reason")
  //     if(reason == "auth") {
  //         toast.error('You need to signin first')
  //         router.replace('/login')
  //     }
  // }, [searchParams])

  const onSubmit = async (data: LoginSchema) => {
    setServerError("");

    try {
      await login(data.email, data.password, data.phone);
      toast.success("Login successful! Welcome Back.");
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed. Please check your phone number.";
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-600 mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Secure Track</h1>
          <p className="text-slate-400">Government Administration Portal</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Admin Login</h2>
          <p className="text-sm text-slate-400 mb-6">
            Enter your credentials to access the dashboard.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="admin@gov.in"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Server Error */}
              {serverError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-400">{serverError}</p>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {form.formState.isSubmitting ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-xs text-slate-500 text-center mt-6">
          Secure Government System • Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}
