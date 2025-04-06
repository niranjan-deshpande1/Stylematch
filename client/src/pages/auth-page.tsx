import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Mail, Lock } from "lucide-react";
import { setGuestMode } from "@/lib/api";
import { insertUserSchema } from "@shared/schema";

// Login validation schema
const loginSchema = z.object({
  username: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

// Register validation schema with email validation
const registerSchema = insertUserSchema.extend({
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  // Check if we should show register form based on localStorage
  const initialTab = (): "login" | "register" => {
    if (typeof window !== 'undefined') {
      const showRegister = localStorage.getItem("showRegisterForm");
      if (showRegister === "true") {
        // Clear the flag so it doesn't persist across page reloads
        localStorage.removeItem("showRegisterForm");
        return "register";
      }
    }
    return "login";
  };

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab());
  const { isAuthenticated, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();

  // Handle form for login
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Handle form for registration
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Submit login form
  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values, {
      onSuccess: () => {
        const redirectPath = localStorage.getItem("redirectAfterAuth") || "/";
        navigate(redirectPath);
        localStorage.removeItem("redirectAfterAuth");
      }
    });
  };

  // Submit registration form
  const onRegisterSubmit = (values: RegisterFormValues) => {
    // Remove the confirmPassword field as it's not part of the API
    const { confirmPassword, ...registrationData } = values;
    
    registerMutation.mutate(registrationData, {
      onSuccess: () => {
        const redirectPath = localStorage.getItem("redirectAfterAuth") || "/";
        navigate(redirectPath);
        localStorage.removeItem("redirectAfterAuth");
      }
    });
  };

  // Continue as guest
  const handleGuestMode = () => {
    setGuestMode(true);
    const redirectPath = localStorage.getItem("redirectAfterAuth") || "/";
    navigate(redirectPath);
    localStorage.removeItem("redirectAfterAuth");
  };

  // Check if user is already logged in and redirect
  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="container px-4 md:px-6 flex flex-col-reverse md:flex-row items-center justify-center md:gap-10 lg:gap-16">
        {/* Left column: Authentication form */}
        <div className="w-full max-w-md space-y-6 py-12">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">welcome to stylematch</h1>
            <p className="text-muted-foreground">
              sign in to access your personal wardrobe
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                {activeTab === "login" ? "sign in" : "create account"}
              </CardTitle>
              <CardDescription>
                {activeTab === "login" 
                  ? "enter your credentials to access your account" 
                  : "fill in your details to create a new account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4 mt-4">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email or Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <Mail className="h-4 w-4" />
                                </span>
                                <Input placeholder="email@example.com" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <Lock className="h-4 w-4" />
                                </span>
                                <Input type="password" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
                          </>
                        ) : "Sign in"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="register" className="space-y-4 mt-4">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <Mail className="h-4 w-4" />
                                </span>
                                <Input placeholder="email@example.com" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <User className="h-4 w-4" />
                                </span>
                                <Input className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <Lock className="h-4 w-4" />
                                </span>
                                <Input type="password" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <Lock className="h-4 w-4" />
                                </span>
                                <Input type="password" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...
                          </>
                        ) : "Create account"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleGuestMode}
              >
                continue as guest
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Hero section */}
        <div className="w-full max-w-md py-12 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">unlock your style potential</h2>
            <p className="text-muted-foreground">
              stylematch helps you organize your wardrobe, discover new outfit combinations, 
              and identify missing pieces to complete your personal style.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                1
              </div>
              <div>
                <h3 className="font-medium">upload inspiration</h3>
                <p className="text-sm text-muted-foreground">
                  save images that inspire your style goals
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                2
              </div>
              <div>
                <h3 className="font-medium">build your digital closet</h3>
                <p className="text-sm text-muted-foreground">
                  add and categorize your clothing items
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                3
              </div>
              <div>
                <h3 className="font-medium">discover new outfits</h3>
                <p className="text-sm text-muted-foreground">
                  get ai-powered outfit recommendations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}