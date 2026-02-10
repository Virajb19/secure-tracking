'use client';

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'nextjs-toploader/app';
import { motion, AnimatePresence } from "framer-motion";

import { loginSchema, LoginSchema, SUBJECTS, CLASS_GROUPS } from "@/lib/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { showSuccessToast } from "@/components/ui/custom-toast";
import { ChevronDown, ChevronUp } from "lucide-react";

// Class group display labels
const classGroupLabels: Record<string, string> = {
  '8-10': 'Class 8-10',
  '11-12': 'Class 11-12 (Higher Secondary)',
};

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState("");
  const [showCoordinatorFields, setShowCoordinatorFields] = useState(false);

  const router = useRouter()

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "", email: "", password: "", subject: undefined, classGroup: undefined
    },
  })

  const searchParams = useSearchParams()

  useEffect(() => {
    const reason = searchParams.get("reason")
    if (reason == "auth") {
      toast.error('You need to signin first', { duration: 4000, closeButton: true, position: 'top-center' });
      router.replace('/login')
    }
  }, [searchParams, router])

  const onSubmit = async (data: LoginSchema) => {
    setServerError("");

    try {
      await login(data.email, data.password, data.phone, data.subject, data.classGroup);
      showSuccessToast("Login successful! Welcome Back.", 4000, 'top-center');
      router.push('/dashboard');
    } catch (err: any) {
      let message = "Login failed. Please check your credentials.";

      if (err?.response?.data?.message) {
        message = err.response.data.message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      // If error mentions Subject or Class Group, show coordinator fields
      if (message.includes('Subject') || message.includes('Class Group')) {
        setShowCoordinatorFields(true);
      }

      setServerError(message);
      toast.error(message, { position: 'top-center', duration: 6000, closeButton: false });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <motion.div
            className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-500/25"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900">Secure Track</h1>
          <p className="text-gray-500">Government Administration Portal</p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xl shadow-gray-200/50"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Admin Login</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your credentials to access the dashboard.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="admin@gov.in"
                        className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 transition-all duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                    <FormLabel className="text-gray-700">Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 transition-all duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                    <FormLabel className="text-gray-700">Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 transition-all duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subject Coordinator Toggle */}
              {/* <button
                type="button"
                onClick={() => setShowCoordinatorFields(!showCoordinatorFields)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                {showCoordinatorFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Subject Coordinator Options
              </button> */}

              {/* Subject Coordinator Fields */}
              {/* <AnimatePresence>
                {showCoordinatorFields && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                      <p className="text-xs text-blue-600">
                        Required only for Subject Coordinator role
                      </p>

                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Subject</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-200 text-gray-900 focus:border-blue-500">
                                  <SelectValue placeholder="Select your subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border-gray-200">
                                {SUBJECTS.map((subject) => (
                                  <SelectItem key={subject} value={subject} className="text-gray-900 hover:bg-gray-100">
                                    {subject}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="classGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Class Group</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-200 text-gray-900 focus:border-blue-500">
                                  <SelectValue placeholder="Select class group" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border-gray-200">
                                {CLASS_GROUPS.map((group) => (
                                  <SelectItem key={group} value={group} className="text-gray-900 hover:bg-gray-100">
                                    {classGroupLabels[group]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence> */}

              {/* Server Error */}
              {serverError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-600">{serverError}</p>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full flex-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <div className='size-4 border-2 border-t-[3px] border-white/20 border-t-white rounded-full animate-spin' />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </motion.div>

        <motion.p
          className="text-xs text-gray-500 text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Secure Government System • Authorized Personnel Only
        </motion.p>
      </motion.div>
    </div>
  );
}
