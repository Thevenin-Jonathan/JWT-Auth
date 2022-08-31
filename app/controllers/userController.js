const User = require("../models/user");

exports.getSignupPage = (req, res) => {
  if (req.user) return res.redirect("/profile");
  res.render("signup");
};

exports.signup = async (req, res) => {
  const body = req.body;

  try {
    // Verify if user already exist
    if (await User.findByEmail(body.email.toString())) {
      const errMessage = "Cet email est déjà utilisé.";
      res.status(400).render("signup", { errMessage });
    }

    // Create user and add him to the DB
    const user = await User.create(body);

    // Send email verification
    user.sendEmailVerification(req.headers.host);

    res.render("signin", { successMessage: "Un email vous a été envoyé pour vérifier votre adresse." });

  } catch (err) {
    console.error(err);
    const errMessage = "Une erreur est survenue.";
    res.status(400).render("signup", { errMessage });
  }
};

exports.getSigninPage = (req, res) => {
  if (req.user) return res.redirect("/profile");
  res.render("signin");
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Get user from DB
    const user = await User.findByEmail(email);
    // If exist, compare password, if match, log in the user, if not, display an error message
    if (user) {
      const match = await user.comparePassword(password);
      if (match) {
        if (user.emailVerified === 0) {
          return res.status(400).render("signin", {
            errMessage: "Veuillez vérifier votre adresse email.",
            url: `/users/sending-email-verification/${user.id}`
          });
        } else {
          req.login(user);
          return res.redirect("/");
        }
      }
    }
    return res.status(404).render("signin", { errMessage: "Email ou mot de passe erroné." });
    // In case of error, remove token from cookie and redirect to home 
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
};

exports.getLostPasswordPage = (_, res) => {
  res.render("lost-password");
};

exports.logout = (req, res) => {
  req.logout();
  res.redirect("/");
};

exports.getProfile = async (req, res) => {
  if (req.user) return res.render("profile", { user: req.user });
  res.render("/");
};

exports.sendEmailVerification = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await User.findOne(userId);

    if (user && user.emailVerified === 0) {
      user.sendEmailVerification(req.headers.host);
      res.render("signin", { successMessage: "Un email vous a été envoyé pour vérifier votre adresse." });
    } else {
      res.status(400).redirect("/");
    }
  } catch (err) {
    console.error(err);
    const errMessage = "Une erreur est survenue.";
    res.status(400).render("signin", { errMessage });
  }
};

exports.getEmailVerificationPage = async (req, res) => {
  try {
    const { userId, userEmailToken } = req.params;
    const user = await User.findOne(userId);

    if (user.emailVerified === 1) {
      res.redirect("/users/signin");
    } else if (user && userEmailToken && userEmailToken === user.emailToken) {
      user.emailVerified = 1;
      await user.save();
      res.render("email-verification");
    } else {
      const errMessage = "Un problème est survenu durant le processus de vérification.";
      res.status(400).render("email-verification", { errMessage });
    };
  } catch (err) {
    console.error(err);
  }
};