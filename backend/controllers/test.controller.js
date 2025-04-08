export const testController = async (req, res) => {
  try {
    res.status(200).json({ message: "Test route is working!" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
