'use server';
import { revalidatePath } from 'next/cache';

export async function updatePlan(id: string, formData: FormData) { return { success: true }; }
export async function addFeature(formData: FormData) { return { success: true }; }
export async function updateFeature(id: string, formData: FormData) { return { success: true }; }
export async function deleteFeature(id: string) { return { success: true }; }
