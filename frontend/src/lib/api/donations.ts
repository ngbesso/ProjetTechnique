import { http } from "./client";
import type {
  Donation,
  DonationConfirm,
  DonationCreate,
  PaymentIntentRequest,
  PaymentIntentResponse,
} from "../../types";

export function createDonation(data: DonationCreate): Promise<Donation> {
  return http.post<Donation>("/api/donations/", data);
}

export function createPaymentIntent(
  data: PaymentIntentRequest
): Promise<PaymentIntentResponse> {
  return http.post<PaymentIntentResponse>("/api/donations/payment-intent", data);
}

export function confirmDonation(data: DonationConfirm): Promise<Donation> {
  return http.post<Donation>("/api/donations/confirm", data);
}

export function fetchMyDonations(): Promise<Donation[]> {
  return http.get<Donation[]>("/api/donations/me");
}

export function fetchAllDonations(): Promise<Donation[]> {
  return http.get<Donation[]>("/api/donations/");
}
