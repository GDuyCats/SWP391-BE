const isAdmin = (req, res, next) => {
  try {
    if (req.user && req.user.role === "admin") {
      next(); 
    } else {
      return res.status(403).json( "Your account have no permission" );
    }
  } catch (error) {
    return res.status(500).json( "Your token have been expired");
  }
};

export default isAdmin;