export const categories = [
  {
    mainCategory: 'EMI',
    subCategories: [
      { name: 'Bike EMI', type: 'EMI', icon: '🏍️' },
      { name: 'Car EMI', type: 'EMI', icon: '🚘' },
      { name: 'Appliances EMI', type: 'EMI', icon: '📺' },
      { name: 'Credit Card EMI', type: 'EMI', icon: '💳' },
      { name: 'Personal loan EMI', type: 'EMI', icon: '🏦' },
      { name: 'Other EMI', type: 'EMI', icon: '📝' },
    ],
  },
  {
    mainCategory: 'Invest',
    subCategories: [
      { name: 'FD', type: 'INVESTMENT', icon: '🏦' },
      { name: 'RD', type: 'INVESTMENT', icon: '📈' },
      { name: 'Mutual Funds', type: 'INVESTMENT', icon: '📊' },
      { name: 'Stocks', type: 'INVESTMENT', icon: '💹' },
      { name: 'Gold', type: 'INVESTMENT', icon: '🪙' },
      { name: 'Silver', type: 'INVESTMENT', icon: '🥈' },
      { name: 'LIC Insurance Premiums', type: 'INVESTMENT', icon: '🛡️' },
      { name: 'Home Loan EMI', type: 'EMI', icon: '🏛️' }, // User asked for Home Loan EMI in Invest option
      { name: 'Purchase House', type: 'INVESTMENT', icon: '🏠' },
    ],
  },
  {
    mainCategory: 'Essential Expenses',
    subCategories: [
      { name: 'House Rent', type: 'EXPENSE', icon: '🏠' },
      { name: 'Electricity Bill', type: 'EXPENSE', icon: '💡' },
      { name: 'Water Bill', type: 'EXPENSE', icon: '🚰' },
      { name: 'Mobile & Broadband', type: 'EXPENSE', icon: '🌐' },
      { name: 'Maid/Cleaning', type: 'EXPENSE', icon: '🧹' },
      { name: 'Groceries', type: 'EXPENSE', icon: '🛒' },
      { name: 'Milk & Dairy', type: 'EXPENSE', icon: '🥛' },
      { name: 'Vegetables & Fruits', type: 'EXPENSE', icon: '🥬' },
      { name: 'Fuel', type: 'EXPENSE', icon: '⛽' },
      { name: 'Property Tax Yearly once', type: 'EXPENSE', icon: '📜' },
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
    mainCategory: 'Health & Security',
    subCategories: [
      { name: 'Medicines', type: 'EXPENSE', icon: '💊' },
      { name: 'Hospital savings(Apart from Health Insurance)', type: 'EXPENSE', icon: '🏥' },
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
