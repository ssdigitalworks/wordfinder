/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    userPayload: string;
  }
}

declare module '*.astro' {
  const component: unknown;
  export default component;
}
