import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import defaultTryoutCriteria from '../../data/defaultTryoutCriteria';

const TryoutEvaluationForm = ({ playerId, evaluatorId }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm();
  const [activeCategory, setActiveCategory] = useState(0);
  const [progress, setProgress] = useState(0);
  const watchedFields = watch();

  useEffect(() => {
    // Calculate progress
    const totalFields = defaultTryoutCriteria.categories.reduce(
      (acc, category) => acc + category.metrics.length,
      0
    );
    const completedFields = Object.keys(watchedFields.scores || {}).length;
    setProgress((completedFields / totalFields) * 100);
  }, [watchedFields]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const formattedScores = {};
      Object.entries(data.scores || {}).forEach(([key, value]) => {
        const [category, metric] = key.split('.');
        if (!formattedScores[category]) {
          formattedScores[category] = {};
        }
        formattedScores[category][metric] = parseInt(value, 10);
      });

      const response = await fetch('/api/tryouts/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          evaluatorId,
          scores: formattedScores,
          notes: data.notes,
          recommendedTeam: data.recommendedTeam,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit evaluation');
      }

      toast.success('Evaluation submitted successfully!');
      reset();
    } catch (error) {
      toast.error('Error submitting evaluation. Please try again.');
      console.error('Evaluation submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScoreInput = (category, metric) => {
    const fieldName = `scores.${category.name}.${metric.name}`;
    return (
      <div key={metric.name} className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="flex flex-col md:flex-row justify-between items-start mb-2">
          <div className="mb-4 md:mb-0 md:mr-4">
            <h4 className="font-semibold text-gray-800">{metric.name}</h4>
            <p className="text-sm text-gray-600">{metric.description}</p>
            {metric.testMethod && (
              <p className="text-sm text-blue-600 mt-1">
                <span className="font-medium">Test Method:</span> {metric.testMethod}
              </p>
            )}
          </div>
          <div className="w-full md:w-auto">
            <select
              {...register(fieldName, { required: 'Score is required' })}
              className="w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select Score</option>
              {[1, 2, 3, 4, 5].map((score) => (
                <option key={score} value={score}>
                  {score} - {metric.guidelines[score]}
                </option>
              ))}
            </select>
            {errors[fieldName] && (
              <p className="mt-1 text-sm text-red-600">{errors[fieldName].message}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-gray-100 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Evaluation Progress</h3>
          <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        {/* Category Navigation */}
        <div className="mb-6">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {defaultTryoutCriteria.categories.map((category, index) => (
              <button
                key={category.name}
                type="button"
                onClick={() => setActiveCategory(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === index
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Active Category Content */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {defaultTryoutCriteria.categories[activeCategory].name}
              </h3>
              <p className="text-sm text-gray-600">
                Category Weight: {defaultTryoutCriteria.categories[activeCategory].weight * 100}%
              </p>
            </div>
            <div className="text-sm text-gray-600">
              {Object.keys(watchedFields.scores || {}).filter(key => 
                key.startsWith(defaultTryoutCriteria.categories[activeCategory].name)
              ).length} / {defaultTryoutCriteria.categories[activeCategory].metrics.length} completed
            </div>
          </div>

          <div className="space-y-4">
            {defaultTryoutCriteria.categories[activeCategory].metrics.map((metric) =>
              renderScoreInput(defaultTryoutCriteria.categories[activeCategory], metric)
            )}
          </div>
        </div>

        {/* Additional Evaluation Information */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Final Evaluation</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recommended Team Level
              </label>
              <select
                {...register('recommendedTeam', { required: 'Team recommendation is required' })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select Team Level</option>
                <option value="varsity">Varsity</option>
                <option value="junior_varsity">Junior Varsity</option>
                <option value="freshman">Freshman</option>
                <option value="development">Development</option>
              </select>
              {errors.recommendedTeam && (
                <p className="mt-1 text-sm text-red-600">{errors.recommendedTeam.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                {...register('notes')}
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Add any additional observations or comments..."
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || progress < 100}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : progress < 100 ? 'Complete All Fields to Submit' : 'Submit Evaluation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TryoutEvaluationForm; 