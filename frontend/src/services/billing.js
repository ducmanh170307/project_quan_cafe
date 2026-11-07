import { ApiClient } from "./api.js";
export class BillQuote {
  constructor({ endpoint, getPayload, onChange }) {
    this.endpoint = endpoint;
    this.getPayload = getPayload;
    this.onChange = onChange;
    this.code = "";
    this.data = null;
    this.busy = false;
    this.error = "";
    this.revision = 0;
  }
  reset() {
    this.revision++;
    this.code = "";
    this.data = null;
    this.busy = false;
    this.error = "";
    this.onChange?.(this);
  }
  async update(code = this.code) {
    const revision = ++this.revision,
      payload = this.getPayload();
    this.code = String(code || "")
      .trim()
      .toUpperCase();
    this.busy = true;
    this.data = null;
    this.error = "";
    this.onChange?.(this);
    if (payload.Items && payload.Items.length === 0) {
      this.code = "";
      this.busy = false;
      this.data = { subtotal: 0, discount: 0, total: 0, voucher: null };
      this.onChange?.(this);
      return this.data;
    }
    try {
      const data = await ApiClient.post(this.endpoint, {
        ...payload,
        MaCode: this.code,
      });
      if (revision !== this.revision) return null;
      this.data = data;
      this.code = data.voucher?.MaCode || "";
      return data;
    } catch (error) {
      if (revision !== this.revision) return null;
      const failed = this.code;
      this.code = "";
      this.error = error.message;
      if (failed) {
        try {
          const fallback = await ApiClient.post(this.endpoint, {
            ...payload,
            MaCode: "",
          });
          if (revision === this.revision) this.data = fallback;
        } catch {
          this.data = null;
        }
      }
      throw error;
    } finally {
      if (revision === this.revision) {
        this.busy = false;
        this.onChange?.(this);
      }
    }
  }
  require() {
    if (this.busy || !this.data)
      throw new Error("Vui lòng đợi hệ thống tính lại tiền hàng và voucher.");
    return this.data;
  }
}
