export const categories = [
  {
    mainCategory: 'Essential Expenses',
    subCategories: [
      { name: 'House Rent', type: 'EXPENSE', icon: '🏠' },
      { name: 'Home Loan EMI', type: 'EMI', icon: '🏛️' },
      { name: 'Electricity Bill', type: 'EXPENSE', icon: '💡' },
      { name: 'Water Bill', type: 'EXPENSE', icon: '🚰' },
      { name: 'Mobile & Broadband', type: 'EXPENSE', icon: '🌐' },
      { name: 'Maid/Cleaning', type: 'EXPENSE', icon: '🧹' },
      { name: 'Property Tax Yearly once', type: 'EXPENSE', icon: '📜' },
      { name: 'EMI', type: 'EMI', icon: '💳' },
    ],
  },
  {
    mainCategory: 'Lifestyle & Travel',
    subCategories: [
      { name: 'Dining Out / Food Delivery', type: 'EXPENSE', icon: '🍽️' },
      { name: 'Shopping', type: 'EXPENSE', icon: '🛍️' },
      { name: 'Movies', type: 'EXPENSE', icon: '🎬' },
      { name: 'Travel & Occasions', type: 'EXPENSE', icon: '✈️' },
    ],
  },
  {
    mainCategory: 'Family & Education',
    subCategories: [
      { name: 'Children', type: 'EXPENSE', icon: '👶' },
      { name: 'School Fees & Education', type: 'EXPENSE', icon: '🎓' },
      { name: 'Groceries', type: 'EXPENSE', icon: '🛒' },
      { name: 'Milk & Dairy', type: 'EXPENSE', icon: '🥛' },
      { name: 'Vegetables & Fruits', type: 'EXPENSE', icon: '🥬' },
    ],
  },
  {
    mainCategory: 'Health & Security',
    subCategories: [
      { name: 'Medicines', type: 'EXPENSE', icon: '💊' },
      { name: 'Hospital savings(Apart from Health Insurance)', type: 'EXPENSE', icon: '🏥' },
      { name: 'Insurance Premiums', type: 'INVESTMENT', icon: '🛡️' },
      { name: 'RD (Recurring Deposit)', type: 'INVESTMENT', icon: '📈' },
    ],
  },
  {
    mainCategory: 'Transport',
    subCategories: [
      { name: 'Fuel', type: 'EXPENSE', icon: '⛽' },
      { name: 'Bike EMI', type: 'EMI', icon: '🏍️' },
      { name: 'Car EMI', type: 'EMI', icon: '🚘' },
      { name: 'Public Transport', type: 'EXPENSE', icon: '🚌' },
    ],
  },
  {
    mainCategory: 'Finance & Saving',
    subCategories: [
      { name: 'Personal Loan EMI', type: 'EMI', icon: '🏦' },
      { name: 'Mutual Funds SIP', type: 'INVESTMENT', icon: '📈' },
      { name: 'Stocks', type: 'INVESTMENT', icon: '📊' },
    ],
  },
  {
    mainCategory: 'Income',
    subCategories: [
      { name: 'Salary', type: 'INCOME', icon: '💼' },
      { name: 'Business / Freelance', type: 'INCOME', icon: '💻' },
      { name: 'Other Income', type: 'INCOME', icon: '💰' },
    ],
  },
  {
    mainCategory: 'Others',
    subCategories: [
      { name: 'Other Expense', type: 'EXPENSE', icon: '💸' },
    ],
  },
];

export const FLAT_CATEGORIES = categories.flatMap(group => 
  group.subCategories.map(sub => ({
    ...sub,
    mainCategory: group.mainCategory
  }))
);
