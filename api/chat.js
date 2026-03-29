module.exports = async (req, res) => {
  res.status(200).json({
    ok: true,
    message: "api funcionando",
    method: req.method,
  });
};