// src/app/auth/signin/page.tsx
import { SignInForm } from "@/components/auth/signin-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage() {
    return (
        <div className="container flex h-[calc(100vh-8rem)] items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Welcome Back!</CardTitle>
                    <CardDescription>Sign in to your account to continue.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SignInForm />
                </CardContent>
            </Card>
        </div>
    )
}
