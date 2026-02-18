import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Loader2, AtSign, ArrowLeft, Gift } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeInput } from '@/components/ui/code-input';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface LoginProps {
  defaultTab?: 'login' | 'register';
}

export default function Login({ defaultTab = 'login' }: LoginProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Verification state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Referral code from URL or localStorage
  const [referralCode, setReferralCode] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    telegram: '',
    referral: '',
  });

  // Handle referral code from URL query param, localStorage, or cookie
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      // Store in localStorage for persistence across page loads
      localStorage.setItem('referral_code', ref);
      setReferralCode(ref);
    } else {
      // Try to get from localStorage
      const storedRef = localStorage.getItem('referral_code');
      if (storedRef) {
        setReferralCode(storedRef);
      } else {
        // Try to get from cookie (set by landing page)
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'referral_code' && value) {
            setReferralCode(value);
            // Also store in localStorage for consistency
            localStorage.setItem('referral_code', value);
            break;
          }
        }
      }
    }
  }, [searchParams]);

  // Handle OAuth error from redirect
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'google_auth_failed': 'Google authentication failed. Please try again.',
        'account_creation_failed': 'Failed to create account. Please try again or use email registration.',
        'token_generation_failed': 'Authentication error. Please try again.',
      };
      setError(errorMessages[errorParam] || 'Authentication failed. Please try again.');
      // Clear the error from URL
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent, isLogin: boolean) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const response = await api.login(formData.email, formData.password);
        login(response.data.token);
        navigate('/phones');
      } else {
        // Check password confirmation
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }
        const finalReferralCode = referralCode || formData.referral;
        const response = await api.register(
          formData.email,
          formData.password,
          formData.telegram || undefined,
          finalReferralCode || undefined
        );
        // Registration now requires email verification
        setVerificationEmail(response.data.email || formData.email);
        setShowVerification(true);
        setResendCooldown(60);
        setSuccess(response.data.message || 'Verification email sent. Please check your inbox.');
        // Clear referral code after successful registration
        localStorage.removeItem('referral_code');
      }
    } catch (err: any) {
      const errorCode = err.response?.data?.error;
      // Handle email not verified error during login
      if (errorCode === 'email_not_verified') {
        setVerificationEmail(err.response?.data?.email || formData.email);
        setShowVerification(true);
        setError('Please verify your email to continue.');
      } else {
        setError(errorCode || 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (codeValue?: string) => {
    setIsLoading(true);
    setError('');

    // Use provided code or fall back to state
    const codeToVerify = codeValue || verificationCode;

    // Ensure code is exactly 6 digits
    const cleanCode = codeToVerify.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.verifyEmail(verificationEmail, cleanCode);
      login(response.data.token);
      navigate('/phones');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await api.resendVerification(verificationEmail);
      setSuccess('New verification code sent.');
      setResendCooldown(60);
      if (response.data.attempts_remaining !== undefined) {
        setAttemptsRemaining(response.data.attempts_remaining);
      }
    } catch (err: any) {
      if (err.response?.data?.retry_after_secs) {
        setResendCooldown(err.response.data.retry_after_secs);
      }
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowVerification(false);
    setVerificationCode('');
    setError('');
    setSuccess('');
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  // Verification form UI
  if (showVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent" />
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-zinc-200/60 via-transparent to-transparent" />
        </div>

        <Card className="w-full max-w-md bg-white border border-zinc-200 shadow-2xl shadow-zinc-200/50 rounded-2xl relative">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold">
              <span className="text-primary">Droid</span>
              <span className="text-zinc-900">Proxy</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Verify Your Email
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="font-medium text-foreground">{verificationEmail}</span>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-sm font-medium text-foreground text-center block">
                  Enter verification code
                </Label>
                <CodeInput
                  value={verificationCode}
                  onChange={setVerificationCode}
                  onSubmit={handleVerifyEmail}
                  disabled={isLoading}
                />
              </div>

              <Button
                onClick={() => handleVerifyEmail()}
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full bg-primary hover:bg-primary/90 text-white h-11 shadow-md hover:shadow-lg transition-all font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>
            </div>

            <div className="mt-6 text-center space-y-3">
              <div>
                <Button
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading || attemptsRemaining <= 0}
                  className="text-sm"
                >
                  {resendCooldown > 0 ? (
                    `Resend code in ${resendCooldown}s`
                  ) : attemptsRemaining <= 0 ? (
                    'No attempts remaining'
                  ) : (
                    'Resend verification code'
                  )}
                </Button>
                {attemptsRemaining < 3 && attemptsRemaining > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
                  </p>
                )}
              </div>

              <Button
                variant="link"
                onClick={handleBackToLogin}
                className="text-sm text-muted-foreground"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back to login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
      {/* Background decoration - subtle for light theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-zinc-200/60 via-transparent to-transparent" />
      </div>

      <Card className="w-full max-w-md bg-white border border-zinc-200 shadow-2xl shadow-zinc-200/50 rounded-2xl relative">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold">
            <span className="text-primary">Droid</span>
            <span className="text-zinc-900">Proxy</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Mobile Proxy Dashboard
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-100 border border-zinc-200 mb-6 p-1 rounded-lg">
              <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">Login</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md">Register</TabsTrigger>
            </TabsList>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            <TabsContent value="login">
              <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      id="login-email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="you@example.com"
                      className="pl-10 bg-zinc-50 border-zinc-200 focus:border-primary focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      id="login-password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Your password"
                      className="pl-10 bg-zinc-50 border-zinc-200 focus:border-primary focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white h-11 shadow-md hover:shadow-lg transition-all font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-sm font-medium text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      id="register-email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="you@example.com"
                      className="pl-10 bg-zinc-50 border-zinc-200 focus:border-primary focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-sm font-medium text-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      id="register-password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="Min 6 characters"
                      className="pl-10 bg-zinc-50 border-zinc-200 focus:border-primary focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password" className="text-sm font-medium text-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      id="register-confirm-password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="Confirm your password"
                      className="pl-10 bg-zinc-50 border-zinc-200 focus:border-primary focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-telegram" className="text-sm font-medium text-foreground">
                    Telegram <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      id="register-telegram"
                      name="telegram"
                      value={formData.telegram}
                      onChange={handleChange}
                      placeholder="username"
                      className="pl-10 bg-zinc-50 border-zinc-200 focus:border-primary focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                </div>

                {!referralCode && (
                  <div className="space-y-2">
                    <Label htmlFor="register-referral" className="text-sm font-medium text-foreground">
                      Referral Code <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <div className="relative">
                      <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        id="register-referral"
                        name="referral"
                        value={formData.referral}
                        onChange={handleChange}
                        placeholder="Enter referral code"
                        className="pl-10 bg-zinc-50 border-zinc-200 focus:border-primary focus:ring-primary/20 shadow-sm"
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white h-11 shadow-md hover:shadow-lg transition-all font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-11 gap-3 bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm hover:shadow transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
