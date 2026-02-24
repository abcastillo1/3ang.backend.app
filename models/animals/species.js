export default function (sequelize, DataTypes) {
  const Species = sequelize.define(
    'Species',
    {
      speciesId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'species_id'
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    },
    {
      tableName: 'species',
      timestamps: false,
      underscored: true
    }
  );

  Species.associate = function (models) {
    Species.hasMany(models.Animal, {
      foreignKey: 'species_id',
      as: 'animals'
    });
  };

  return Species;
}
