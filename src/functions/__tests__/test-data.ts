// Sample MRZ data for testing
export const sampleMRZData = {
  documentType: 'P',
  countryCode: 'UTO',
  surname: 'ERIKSSON',
  givenNames: 'ANNA MARIA',
  documentNumber: 'L898902C',
  nationality: 'UTO',
  dateOfBirth: '690806',
  sex: 'F',
  dateOfExpiry: '940623',
  personalNumber: '6ZE184226B<<<<<1',
  checksum: '4'
};

export const sampleMRZLines = [
  'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  'L898902C<3UTO6908061F9406236ZE184226B<<<<<14'
];

export const sampleStorageEvent = {
  bucket: 'test-bucket',
  name: 'user123/passport456.jpg',
  contentType: 'image/jpeg',
  size: '1024',
  timeCreated: '2024-01-01T00:00:00Z',
  updated: '2024-01-01T00:00:00Z'
};
