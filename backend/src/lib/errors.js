class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const assert = (condition, status, message) => {
  if (!condition) throw new AppError(status, message);
};
const route = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
module.exports = { AppError, assert, route };
