import { Suspense } from 'react';
import { connection } from 'next/server';
import AnalyzeClient from './analyze-client';

interface Provider {
    provider: string;
    models: string[];
    default_model: string;
    requires_project_id: boolean;
}

interface Providers {
    providers: Provider[];
}

interface ProviderModelConfig {
    models: string[];
    defaultModel: string;
}

async function getProviders(): Promise<Providers> {
    const apiBaseUrl = process.env.API_BASE_URL;
    console.log('apiBaseUrl - ', apiBaseUrl);
    if (!apiBaseUrl) {
        throw new Error('API_BASE_URL must be configured to load providers');
    }

    const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/providers`, {
        next: { revalidate: 3600 }, // Cache data and re-check it every hour
    });

    if (!res.ok) {
        throw new Error('Failed to load AI providers');
    }

    return (await res.json()) as Providers;
}

async function getProvidersData(): Promise<{
    providerList: string[];
    providerModels: Record<string, ProviderModelConfig>;
}> {
    const providerData = await getProviders();
    const providerList: string[] = [];
    const providerModels: Record<string, ProviderModelConfig> = {};

    for (const provider of providerData.providers) {
        const prov = provider.provider;
        providerList.push(prov);
        providerModels[prov] = {
            models: provider.models,
            defaultModel: provider.default_model,
        };
    }

    return {
        providerList,
        providerModels
    }
}

async function AnalyzeContent() {
    // Providers come from the live backend, so resolve them per request instead of at build time
    await connection();
    try {
        const { providerList, providerModels } = await getProvidersData();
        return <AnalyzeClient providerList={providerList} providerModels={providerModels} />;
    } catch {
        return (
            <main className="mx-auto max-w-2xl p-8 text-center" role="alert">
                <h1 className="text-2xl font-bold">AI providers are unavailable</h1>
                <p className="mt-2">Check the backend connection and API_BASE_URL, then reload this page.</p>
            </main>
        );
    }
}

export default function Analyze() {
    return (
        <Suspense fallback={<p className="p-8 text-center">Loading providers...</p>}>
            <AnalyzeContent />
        </Suspense>
    );
}
