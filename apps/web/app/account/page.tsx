"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Member = { email: string; name: string };

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text = "";
  bytes.forEach((byte) => {
    text += String.fromCharCode(byte);
  });
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64ToBuffer(value: string): ArrayBuffer {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [devToken, setDevToken] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetch("/backend/v1/me", { cache: "no-store" }).then(async (response) => {
        if (response.ok) setMember((await response.json()) as Member);
      });
      const token = new URLSearchParams(window.location.search).get("token");
      if (!token) return;
      void fetch("/backend/v1/auth/magic-link/consume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }).then(async (response) => {
        if (!response.ok) {
          setMessage("That sign-in link has expired.");
          return;
        }
        setMember((await response.json()) as Member);
        window.history.replaceState(null, "", "/account");
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  async function requestLink() {
    setMessage("");
    const response = await fetch("/backend/v1/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      setMessage("Enter a valid email address.");
      return;
    }
    const body = (await response.json()) as { dev_token?: string };
    setDevToken(body.dev_token ?? "");
    setMessage("The sign-in link is ready.");
  }

  async function createPasskey() {
    setMessage("");
    const optionsResponse = await fetch("/backend/v1/auth/passkey/register/options", { method: "POST" });
    if (!optionsResponse.ok) {
      setMessage("Sign in before creating a passkey.");
      return;
    }
    const options = (await optionsResponse.json()) as {
      challenge: string;
      user: { id: string; name: string; displayName: string };
      rp: { name: string; id: string };
      pubKeyCredParams: PublicKeyCredentialParameters[];
      timeout: number;
      excludeCredentials: { id: string; type: PublicKeyCredentialType }[];
    };
    let credential: PublicKeyCredential | null = null;
    try {
      credential = (await navigator.credentials.create({
      publicKey: {
        challenge: base64ToBuffer(options.challenge),
        rp: options.rp,
        user: {
          id: base64ToBuffer(options.user.id),
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout,
        excludeCredentials: options.excludeCredentials.map((item) => ({
          type: item.type,
          id: base64ToBuffer(item.id),
        })),
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    } catch {
      setMessage("This device did not create a passkey.");
      return;
    }
    if (!credential) return;
    const attestation = credential.response as AuthenticatorAttestationResponse;
    const saved = await fetch("/backend/v1/auth/passkey/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        credential: {
          id: credential.id,
          rawId: bufferToBase64(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: bufferToBase64(attestation.clientDataJSON),
            attestationObject: bufferToBase64(attestation.attestationObject),
          },
        },
      }),
    });
    setMessage(saved.ok ? "Passkey saved on this device." : "That passkey could not be saved.");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-6 py-16">
      <Link href="/" className="font-sans text-sm tracking-[0.18em] text-muted uppercase">
        Home
      </Link>
      <h1 className="font-display text-5xl font-semibold tracking-tight">Account</h1>
      {member ? (
        <>
          <p className="font-sans text-muted">Signed in as {member.email}</p>
          <button type="button" className="w-fit rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary" onClick={() => void createPasskey()}>
            Create a passkey
          </button>
          <button
            type="button"
            className="w-fit font-sans text-sm text-muted"
            onClick={() =>
              void fetch("/backend/v1/auth/logout", { method: "POST" }).then(() => {
                setMember(null);
              })
            }
          >
            Sign out
          </button>
        </>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void requestLink();
          }}
        >
          <label className="flex flex-col gap-2 font-sans text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-muted bg-transparent px-4 py-3"
            />
          </label>
          <button type="submit" className="w-fit rounded-full bg-primary px-5 py-3 font-sans text-sm text-on-primary">
            Email me a sign-in link
          </button>
          {devToken ? (
            <Link href={`/account?token=${encodeURIComponent(devToken)}`} className="font-sans text-sm text-muted">
              Open the sign-in link
            </Link>
          ) : null}
        </form>
      )}
      {message ? (
        <p className="font-sans text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
    </main>
  );
}
