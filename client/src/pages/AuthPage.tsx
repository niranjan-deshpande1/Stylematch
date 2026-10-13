import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { REDIRECT_KEY } from "@/lib/protected-route";

const loginSchema = z.object({
  username: z.string().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
});

const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    username: z.string().min(3, "At least 3 characters").max(30, "30 characters max"),
    password: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type Tab = "login" | "register";

const STEPS = [
  { title: "upload inspiration", text: "save photos of outfits you want to recreate" },
  { title: "build your digital closet", text: "add and categorize the clothes you own" },
  { title: "discover new outfits", text: "get outfit ideas made from your own closet" },
];

export default function AuthPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { user, isGuest, loginMutation, registerMutation, guestMutation } = useAuth();
  const [tab, setTab] = useState<Tab>(new URLSearchParams(search).get("tab") === "register" ? "register" : "login");

  const goToNextPage = useCallback(() => {
    const target = sessionStorage.getItem(REDIRECT_KEY) ?? "/";
    sessionStorage.removeItem(REDIRECT_KEY);
    navigate(target, { replace: true });
  }, [navigate]);

  // Leave once someone signs in, or once a guest session they just asked for is active.
  // A guest who comes back here later stays, so they can sign up.
  const [enteringAsGuest, setEnteringAsGuest] = useState(false);
  useEffect(() => {
    if (user || (enteringAsGuest && isGuest)) goToNextPage();
  }, [user, isGuest, enteringAsGuest, goToNextPage]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", username: "", password: "", confirmPassword: "" },
  });

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="container flex flex-col items-center justify-center px-4 md:flex-row md:gap-10 md:px-6 lg:gap-16">
        <div className="w-full max-w-md space-y-6 py-12">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">welcome to stylematch</h1>
            <p className="text-muted-foreground">sign in to get to your closet</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{tab === "login" ? "sign in" : "create account"}</CardTitle>
              <CardDescription>
                {tab === "login" ? "use your email or username" : "pick a username and password"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">login</TabsTrigger>
                  <TabsTrigger value="register">register</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-4">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit((values) => loginMutation.mutate(values))} className="space-y-4">
                      <IconField form={loginForm} name="username" label="email or username" icon={Mail} placeholder="email@example.com" />
                      <IconField form={loginForm} name="password" label="password" icon={Lock} type="password" />
                      <SubmitButton pending={loginMutation.isPending} idle="sign in" busy="signing in..." />
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register" className="mt-4">
                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(({ confirmPassword: _confirm, ...values }) =>
                        registerMutation.mutate(values),
                      )}
                      className="space-y-4"
                    >
                      <IconField form={registerForm} name="email" label="email" icon={Mail} placeholder="email@example.com" />
                      <IconField form={registerForm} name="username" label="username" icon={User} />
                      <IconField form={registerForm} name="password" label="password" icon={Lock} type="password" />
                      <IconField form={registerForm} name="confirmPassword" label="confirm password" icon={Lock} type="password" />
                      <SubmitButton pending={registerMutation.isPending} idle="create account" busy="creating account..." />
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              {isGuest ? (
                <p className="text-center text-xs text-muted-foreground">
                  you're using stylematch as a guest. sign up and everything you've uploaded moves to your account.
                </p>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setEnteringAsGuest(true);
                      guestMutation.mutate();
                    }}
                    disabled={guestMutation.isPending}
                  >
                    continue as guest
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    guest uploads move to your account if you sign up later
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="w-full max-w-md space-y-6 py-12">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">how it works</h2>
            <p className="text-muted-foreground">
              stylematch organizes your wardrobe, finds new outfit combinations, and tells you which pieces you're
              missing for the looks you want.
            </p>
          </div>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex items-start space-x-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">{i + 1}</span>
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

interface IconFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  icon: typeof Mail;
  type?: string;
  placeholder?: string;
}

function IconField<T extends FieldValues>({ form, name, label, icon: Icon, type = "text", placeholder }: IconFieldProps<T>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <Icon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type={type} placeholder={placeholder} className="pl-10" {...field} />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SubmitButton({ pending, idle, busy }: { pending: boolean; idle: string; busy: string }) {
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? busy : idle}
    </Button>
  );
}
