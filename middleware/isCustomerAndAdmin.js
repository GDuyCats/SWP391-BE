const isCustomerOrAdmin = (req, res, next) => {
  try {
    if (req.user && (req.user.role === "customer" || req.user.role === "admin")) {
      return next(); // ✅ cho phép đi tiếp
    } else {
      return res.status(403).json({ message: "Your account has no permission" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Your token is invalid or expired" });
  }
};

export default isCustomerOrAdmin;
