import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowLeft, Check } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeInput } from '@/components/ui/code-input';

type Step = 'email' | 'code' | 'password' | 'success';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.forgotPassword(email);
      setSuccess('If an account exists with this email, you will receive a reset code.');
      setStep('code');
      setResendCooldown(60);
    } catch (err: any) {
      if (err.response?.data?.retry_after_secs) {
        setResendCooldown(err.response.data.retry_after_secs);
        setError(`Please wait ${err.response.data.retry_after_secs} seconds before requesting another code.`);
      } else {
        setError(err.response?.data?.error || 'Failed to send reset email');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.verifyResetCode(email, code);
      setResetToken(response.data.reset_token);
      setStep('password');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await api.resetPassword(resetToken, newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      await api.forgotPassword(email);
      setSuccess('New reset code sent.');
      setResendCooldown(60);
    } catch (err: any) {
      if (err.response?.data?.retry_after_secs) {
        setResendCooldown(err.response.data.retry_after_secs);
      }
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold">
                <span className="text-primary">Droid</span>
                <span className="text-zinc-900">Proxy</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Reset Your Password
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">
                  Enter your email and we'll send you a code to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
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
                      Sending...
                    </>
                  ) : (
                    'Send Reset Code'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center">
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Back to login
                </Link>
              </div>
            </CardContent>
          </>
        );

      case 'code':
        return (
          <>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold">
                <span className="text-primary">Droid</span>
                <span className="text-zinc-900">Proxy</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter Reset Code
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
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

              <div className="space-y-4">
                <CodeInput
                  value={code}
                  onChange={setCode}
                  onSubmit={() => handleVerifyCode({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={isLoading}
                />

                <Button
                  onClick={() => handleVerifyCode({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={isLoading || code.length !== 6}
                  className="w-full bg-primary hover:bg-primary/90 text-white h-11 shadow-md hover:shadow-lg transition-all font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
              </div>

              <div className="mt-6 text-center space-y-3">
                <Button
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-sm"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </Button>

                <div>
                  <Button
                    variant="link"
                    onClick={() => { setStep('email'); setError(''); setSuccess(''); }}
                    className="text-sm text-muted-foreground"
                  >
                    <ArrowLeft className="mr-1 h-3 w-3" />
                    Use different email
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        );

      case 'password':
        return (
          <>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold">
                <span className="text-primary">Droid</span>
                <span className="text-zinc-900">Proxy</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Set New Password
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium text-foreground">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      id="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Min 6 characters"
                      className="pl-10 bg-zinc-50 border-zinc-200 focus:border-primary focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Confirm your password"
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
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        );

      case 'success':
        return (
          <>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold">
                <span className="text-primary">Droid</span>
                <span className="text-zinc-900">Proxy</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Password Reset Complete
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-muted-foreground">
                  Your password has been reset successfully.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-primary hover:bg-primary/90 text-white h-11 shadow-md hover:shadow-lg transition-all font-medium"
                >
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-zinc-200/60 via-transparent to-transparent" />
      </div>

      <Card className="w-full max-w-md bg-white border border-zinc-200 shadow-2xl shadow-zinc-200/50 rounded-2xl relative">
        {renderStep()}
      </Card>
    </div>
  );
}
