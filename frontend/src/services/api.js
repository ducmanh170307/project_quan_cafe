const ApiClient = {
  async request(endpoint, method = "GET", payload) {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api" + endpoint, {
        method,
        credentials: "same-origin",
        headers:
          payload === undefined ? {} : { "Content-Type": "application/json" },
        body: payload === undefined ? undefined : JSON.stringify(payload),
        signal: controller.signal,
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(
          "Máy chủ trả dữ liệu không hợp lệ. Hãy mở giao diện qua địa chỉ backend.",
        );
      }
      if (!response.ok || data.success === false) {
        const error = new Error(data.message || "Yêu cầu thất bại.");
        error.status = response.status;
        if (response.status === 401 && endpoint != "/auth/login")
          window.dispatchEvent(new Event("session-expired"));
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === "AbortError" || error instanceof TypeError)
        throw new Error(
          method === "GET"
            ? "Không kết nối được máy chủ. Kiểm tra backend."
            : "Mất kết nối, chưa xác định được kết quả. Hãy tải lại dữ liệu; đơn hàng có mã chống gửi trùng.",
        );
      throw error;
    } finally {
      clearTimeout(timer);
    }
  },
  get(endpoint) {
    return this.request(endpoint);
  },
  post(endpoint, data) {
    return this.request(endpoint, "POST", data);
  },
  put(endpoint, data) {
    return this.request(endpoint, "PUT", data);
  },
  delete(endpoint) {
    return this.request(endpoint, "DELETE");
  },
};
const UI = {
  pending: 0,
  isoDay(value) {
    return new Date(new Date(value).getTime() + 7 * 3600000)
      .toISOString()
      .slice(0, 10);
  },
  clock(value) {
    return new Date(new Date(value).getTime() + 7 * 3600000)
      .toISOString()
      .slice(11, 16);
  },
  addDays(value, days) {
    return new Date(new Date(value + "T00:00:00Z").getTime() + days * 86400000)
      .toISOString()
      .slice(0, 10);
  },
  monday(value) {
    return this.addDays(
      value,
      -((new Date(value + "T00:00:00Z").getUTCDay() + 6) % 7),
    );
  },
  uuid() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    const a = crypto.getRandomValues(new Uint8Array(16));
    a[6] = (a[6] & 15) | 64;
    a[8] = (a[8] & 63) | 128;
    const h = [...a].map((x) => x.toString(16).padStart(2, "0"));
    return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
  },
  el(id) {
    return document.getElementById(id);
  },
  value(id) {
    return this.el(id).value.trim();
  },
  escape(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  },
  money(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  },
  date(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  },
  today() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  },
  notify(message, error = false) {
    const e = this.el("notice");
    e.hidden = false;
    e.className = error ? "notice error-notice" : "notice";
    e.textContent = message;
  },
  async run(button, action) {
    if (button?.dataset.busy) return;
    if (button) {
      button.dataset.busy = "1";
      button.disabled = true;
    }
    this.pending++;
    try {
      return await action();
    } catch (error) {
      this.notify(error.message, true);
    } finally {
      this.pending--;
      if (button) {
        delete button.dataset.busy;
        button.disabled = false;
        if (button.id === "btnCheckout") window.TrucModule?.renderBill();
      }
    }
  },
  options(rows, id, name) {
    return rows
      .map(
        (r) =>
          `<option value="${Number(r[id])}">${this.escape(r[name])}</option>`,
      )
      .join("");
  },
  empty(cols, message = "Chưa có dữ liệu") {
    return `<tr><td colspan="${cols}" class="muted">${this.escape(message)}</td></tr>`;
  },
};

export { ApiClient, UI };
